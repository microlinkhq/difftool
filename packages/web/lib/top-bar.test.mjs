import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  barChildren,
  isBarScrolled,
  menuButtonLabel,
  menuIconHidden,
  menuPanelHidden,
  menuPanelKey,
  onMenuKey,
  toggleOpen,
  topBarClass
} from './top-bar.ts'

describe('top bar', () => {
  test('the bar is scrolled only after 8px', () => {
    assert.equal(isBarScrolled(8), false)
    assert.equal(isBarScrolled(9), true)
    assert.equal(isBarScrolled(0), false)
  })

  test('the shadow appears only when the bar is sticky and the page has scrolled', () => {
    assert.match(topBarClass(true, true), /sticky top-0/)
    assert.match(topBarClass(true, true), /shadow-/)
    assert.match(topBarClass(true, false), /sticky top-0/)
    assert.doesNotMatch(topBarClass(true, false), /shadow-/)
    assert.doesNotMatch(topBarClass(false, true), /sticky/)
    assert.doesNotMatch(topBarClass(false, true), /shadow-/)
  })

  test('escape closes the menu and other keys do not', () => {
    let closed = 0
    onMenuKey({ key: 'Enter' }, () => { closed++ })
    assert.equal(closed, 0)
    onMenuKey({ key: 'Escape' }, () => { closed++ })
    assert.equal(closed, 1)
  })

  test('the menu button, panel, and icons follow the open flag', () => {
    assert.equal(barChildren(undefined, 'landing'), 'landing')
    assert.equal(barChildren('comparison', 'landing'), 'comparison')
    assert.equal(toggleOpen(false), true)
    assert.equal(toggleOpen(true), false)
    assert.equal(menuButtonLabel(true), 'Close menu')
    assert.equal(menuButtonLabel(false), 'Open menu')
    assert.equal(menuPanelHidden(true), false)
    assert.equal(menuPanelHidden(false), true)
    assert.equal(menuPanelKey(true), 'open')
    assert.equal(menuPanelKey(false), 'closed')
    assert.equal(menuIconHidden(true, 'menu'), true)
    assert.equal(menuIconHidden(true, 'close'), false)
    assert.equal(menuIconHidden(false, 'menu'), false)
    assert.equal(menuIconHidden(false, 'close'), true)
  })
})
