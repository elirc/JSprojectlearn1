using System.Text;

// THE INTEGRATION SUITE — a real HTTP server, in this process, on a random
// free port, for the duration of these assertions.
//
// The harness is four moves:
//
//   1. Api.Build([], quiet: true)      the same app Program.cs runs
//   2. app.Urls.Add("http://127.0.0.1:0")
//                                      port 0 means "OS, pick a free one".
//                                      Hard-coding 5035 would make the test
//                                      fail whenever you left the real server
//                                      running — a flaky test nobody trusts.
//   3. await app.StartAsync()          Kestrel binds, then REWRITES app.Urls
//                                      with the port it actually got. That is
//                                      how we learn where to send requests.
//   4. await app.StopAsync()           in a `finally`, always. A test that
//                                      leaks a listening socket poisons every
//                                      test after it.
//
// Real projects use `WebApplicationFactory<T>` from
// Microsoft.AspNetCore.Mvc.Testing (a NuGet package) instead of these four
// lines. It does the same job with extras — an in-memory transport so no real
// socket is opened, and hooks to swap services for fakes. We hand-roll it here
// for the same reason this repo hand-rolls `Check` instead of using xUnit:
// offline, zero setup, and you get to see the mechanism before the convenience.

public static class HttpTests
{
    // Tests.Run() is synchronous, so this is the one place the async world is
    // bridged back. GetAwaiter().GetResult() rather than .Result so exceptions
    // arrive unwrapped instead of inside an AggregateException.
    public static void Run() => RunAsync().GetAwaiter().GetResult();

    private static async Task RunAsync()
    {
        var app = Api.Build([], quiet: true);
        app.Urls.Clear();
        app.Urls.Add("http://127.0.0.1:0");

        await app.StartAsync();
        try
        {
            var baseAddress = app.Urls.First();
            Check.True(baseAddress.StartsWith("http://127.0.0.1:") && !baseAddress.EndsWith(":0"),
                $"[http] Kestrel bound a real port and told us which one ({baseAddress})");

            using var http = new HttpClient
            {
                BaseAddress = new Uri(baseAddress),
                Timeout = TimeSpan.FromSeconds(15),   // a hung request must fail, not hang the suite
            };

            await Suite(http);
        }
        finally
        {
            // Cleanly, and even if an assertion threw.
            await app.StopAsync();
            await app.DisposeAsync();
        }
    }

    private static async Task Suite(HttpClient http)
    {
        // ---- the empty world -------------------------------------------------
        var empty = await http.GetAsync("/orders");
        Check.Equal(200, (int)empty.StatusCode, "[http] GET /orders on a fresh server is 200");
        Check.Equal("application/json", empty.Content.Headers.ContentType?.MediaType,
            "[http] ...and says it is JSON");
        Check.Equal(0, (await empty.Content.ReadFromJsonAsync<List<OrderDto>>())!.Count,
            "[http] ...with an empty array, not null");

        // ---- creating: the status code and the header ------------------------
        var created = await http.PostAsJsonAsync("/orders", new
        {
            lines = new[] { new { sku = "BOOK-1", qty = 3, unitPrice = 19.99m } },
        });
        Check.Equal(201, (int)created.StatusCode,
            "[http] POST answers 201 Created, not 200 OK (the original's bug #3)");
        Check.Equal("/orders/1", created.Headers.Location?.ToString(),
            "[http] ...and a Location header saying where the order lives");

        var body = await created.Content.ReadFromJsonAsync<OrderDto>();
        Check.Equal(1, body!.Id, "[http] the new order has id 1");
        Check.Equal(59.97m, body.Subtotal, "[http] 3 x 19.99 = 59.97 (the original said 59.97000000000000063...)");
        Check.Equal(4.80m, body.Tax, "[http] 8% of 59.97, rounded to cents");
        Check.Equal(64.77m, body.Total, "[http] and a total an accountant would recognise");
        Check.Equal(body.Total, body.Subtotal + body.Tax,
            "[http] THE INVARIANT, checked on the JSON the client actually receives");

        // ---- the Location header is a promise; test that it resolves ---------
        var followed = await http.GetAsync(created.Headers.Location!.ToString());
        Check.Equal(200, (int)followed.StatusCode, "[http] following Location works");
        Check.Equal(64.77m, (await followed.Content.ReadFromJsonAsync<OrderDto>())!.Total,
            "[http] ...and lands on the order we just created");

        var listed = await (await http.GetAsync("/orders")).Content.ReadFromJsonAsync<List<OrderDto>>();
        Check.Equal(1, listed!.Count, "[http] the collection now has one order");
        Check.Equal(64.77m, listed[0].Total, "[http] ...with the same total as the create response");

        // ---- the missing order: the bug this project is named after ----------
        var missing = await http.GetAsync("/orders/999");
        Check.Equal(404, (int)missing.StatusCode,
            "[http] a missing order is 404 — NOT 200 with a null body (the original's bug #2)");
        var missingError = await missing.Content.ReadFromJsonAsync<ErrorDto>();
        Check.True(missingError!.Error.Contains("999"), "[http] ...and the body names the id");

        var badId = await http.GetAsync("/orders/abc");
        Check.Equal(404, (int)badId.StatusCode,
            "[http] a non-integer id matches no route at all, so: 404");

        // ---- validation: 400s, with every problem listed ---------------------
        var noLines = await http.PostAsJsonAsync("/orders", new { lines = Array.Empty<object>() });
        Check.Equal(400, (int)noLines.StatusCode, "[http] an order with no lines is 400");
        Check.Equal(1, (await noLines.Content.ReadFromJsonAsync<ErrorsDto>())!.Errors.Length,
            "[http] ...with exactly one clear message");

        var badLine = await http.PostAsJsonAsync("/orders", new
        {
            lines = new[] { new { sku = "", qty = 0, unitPrice = -1m } },
        });
        Check.Equal(400, (int)badLine.StatusCode, "[http] a junk line is 400");
        Check.Equal(3, (await badLine.Content.ReadFromJsonAsync<ErrorsDto>())!.Errors.Length,
            "[http] ...listing ALL three problems, so the client fixes them in one round trip");

        var malformed = await http.PostAsync("/orders",
            new StringContent("{ this is not json", Encoding.UTF8, "application/json"));
        Check.Equal(400, (int)malformed.StatusCode,
            "[http] malformed JSON is 400 — the framework handles it, and this proves it");

        var listStillOne = await (await http.GetAsync("/orders")).Content.ReadFromJsonAsync<List<OrderDto>>();
        Check.Equal(1, listStillOne!.Count, "[http] and none of those failures created anything");

        // ---- deleting --------------------------------------------------------
        var deleted = await http.DeleteAsync("/orders/1");
        Check.Equal(204, (int)deleted.StatusCode, "[http] DELETE answers 204 No Content");
        Check.Equal(0L, deleted.Content.Headers.ContentLength.GetValueOrDefault(),
            "[http] ...with an empty body, as 204 requires");
        Check.Equal(404, (int)(await http.GetAsync("/orders/1")).StatusCode,
            "[http] the deleted order is really gone");
        Check.Equal(404, (int)(await http.DeleteAsync("/orders/1")).StatusCode,
            "[http] deleting it again is 404, not a cheerful 204");

        // ---- ids are not recycled -------------------------------------------
        var awkward = await http.PostAsJsonAsync("/orders", new
        {
            lines = new[] { new { sku = "TILE-1", qty = 3, unitPrice = 0.335m } },
        });
        var awk = await awkward.Content.ReadFromJsonAsync<OrderDto>();
        Check.Equal(2, awk!.Id, "[http] the next order is id 2 — deleting 1 does not free the id");
        Check.Equal(1.01m, awk.Subtotal,
            "[http] 3 x 0.335 = 1.005, rounded AWAY FROM ZERO to 1.01 (banker's rounding would say 1.00)");
        Check.Equal(0.08m, awk.Tax, "[http] tax on 1.01");
        Check.Equal(1.09m, awk.Total, "[http] and the total");
        Check.Equal(awk.Total, awk.Subtotal + awk.Tax,
            "[http] the invariant survives an awkward price and a JSON round trip");
    }

    // Small read-only shapes for the assertions. They deliberately don't
    // mention `Lines`: System.Text.Json ignores JSON properties a target type
    // doesn't have, so a test can name only what it cares about.
    private record OrderDto(int Id, decimal Subtotal, decimal Tax, decimal Total);
    private record ErrorDto(string Error);
    private record ErrorsDto(string[] Errors);
}
