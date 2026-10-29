import assert from 'node:assert/strict'
import { createElement } from 'react'
import { describe, test } from 'node:test'

import { mapRevealChild, observeWhenVisible, revealAttribute, showWhenNear } from './reveal.ts'

describe('reveal', () => {
  test('idle has no attribute, and pending and shown keep their names', () => {
    assert.equal(revealAttribute('idle'), undefined)
    assert.equal(revealAttribute('pending'), 'pending')
    assert.equal(revealAttribute('shown'), 'shown')
    assert.equal(showWhenNear(false, 'view'), null)
    assert.equal(showWhenNear(true, 'view'), 'view')
  })

  test('elements receive a reveal index and other children are returned', () => {
    const element = mapRevealChild(createElement('p', { style: { color: 'red' } }), 2)
    assert.equal(element.props.style['--reveal-index'], 2)
    assert.equal(element.props.style.color, 'red')
    assert.equal(mapRevealChild('plain', 1), 'plain')
    assert.equal(mapRevealChild(null, 0), null)
  })

  test('observation starts only with an element and an observer, and fires once', () => {
    const hooks = () => {
      const order = []
      return {
        order,
        onStart: () => order.push('start'),
        onVisible: () => order.push('visible')
      }
    }

    const idle = hooks()
    observeWhenVisible(null, class {}, {}, idle)()
    observeWhenVisible({}, undefined, {}, idle)
    assert.deepEqual(idle.order, [])

    let callback
    let options
    let disconnected = 0
    class Observer {
      constructor (cb, opts) {
        callback = cb
        options = opts
      }

      observe () {
        this.cb = callback
      }

      disconnect () {
        disconnected++
      }
    }

    const live = hooks()
    const stop = observeWhenVisible({}, Observer, { rootMargin: '400px 0px' }, live)
    assert.deepEqual(options, { rootMargin: '400px 0px' })
    callback([{ isIntersecting: false }])
    callback([])
    assert.deepEqual(live.order, ['start'])
    callback([{ isIntersecting: true }])
    callback([{ isIntersecting: true }])
    assert.deepEqual(live.order, ['start', 'visible'])
    assert.equal(disconnected, 1)
    stop()
    assert.equal(disconnected, 2)
  })

  test('a synchronous intersection still starts before it shows', () => {
    const order = []
    class Observer {
      constructor (cb) { this.cb = cb }
      observe () { this.cb([{ isIntersecting: true }]) }
      disconnect () {}
    }
    observeWhenVisible({}, Observer, {}, {
      onStart: () => order.push('start'),
      onVisible: () => order.push('visible')
    })
    assert.deepEqual(order, ['start', 'visible'])
  })

  test('onStart can be omitted', () => {
    let visible = 0
    class Observer {
      constructor (cb) { this.cb = cb }
      observe () { this.cb([{ isIntersecting: true }]) }
      disconnect () {}
    }
    observeWhenVisible({}, Observer, {}, { onVisible: () => { visible++ } })
    assert.equal(visible, 1)
  })
})
