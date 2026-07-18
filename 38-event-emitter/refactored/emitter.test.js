import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from './emitter.js';

test('multiple listeners all fire, in subscription order', () => {
  const emitter = new EventEmitter();
  const log = [];
  emitter.on('done', (f) => log.push(`notify:${f}`));
  emitter.on('done', (f) => log.push(`stats:${f}`));
  emitter.emit('done', 'report.pdf');
  assert.deepEqual(log, ['notify:report.pdf', 'stats:report.pdf']);
});

test('subscribing does not overwrite earlier listeners (the original bug)', () => {
  const emitter = new EventEmitter();
  let firstCalled = false;
  emitter.on('done', () => { firstCalled = true; });
  emitter.on('done', () => {});
  emitter.emit('done');
  assert.equal(firstCalled, true);
});

test('the returned unsubscribe function works, and only removes ITS listener', () => {
  const emitter = new EventEmitter();
  const log = [];
  const offA = emitter.on('tick', () => log.push('a'));
  emitter.on('tick', () => log.push('b'));

  offA();
  emitter.emit('tick');
  assert.deepEqual(log, ['b']);
});

test('a throwing listener cannot stop the others', () => {
  const emitter = new EventEmitter();
  const log = [];
  emitter.on('done', () => log.push('log'));
  emitter.on('done', () => { throw new Error('logger exploded'); });
  emitter.on('done', () => log.push('stats')); // the original never ran this

  assert.throws(() => emitter.emit('done'), AggregateError);
  assert.deepEqual(log, ['log', 'stats']); // everyone got their delivery
});

test('...but the failure is still reported, with the original error inside', () => {
  const emitter = new EventEmitter();
  emitter.on('done', () => { throw new Error('boom'); });
  try {
    emitter.emit('done');
    assert.fail('should have thrown');
  } catch (err) {
    assert.ok(err instanceof AggregateError);
    assert.equal(err.errors[0].message, 'boom');
  }
});

test('once fires exactly once', () => {
  const emitter = new EventEmitter();
  let calls = 0;
  emitter.once('ping', () => calls++);
  emitter.emit('ping');
  emitter.emit('ping');
  assert.equal(calls, 1);
});

test('unsubscribing during emit does not skip other listeners', () => {
  const emitter = new EventEmitter();
  const log = [];
  const offA = emitter.on('tick', () => { log.push('a'); offA(); });
  emitter.on('tick', () => log.push('b'));
  emitter.emit('tick');
  assert.deepEqual(log, ['a', 'b']); // b still delivered this round
  emitter.emit('tick');
  assert.deepEqual(log, ['a', 'b', 'b']); // a is gone next round
});

test('emitting an event nobody listens to is fine', () => {
  assert.equal(new EventEmitter().emit('silence'), 0);
});
