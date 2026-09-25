import test from 'node:test'
import assert from 'node:assert/strict'
import { CENTER, coverOverflow, dragFocus, focusPosition } from '../src/utils/coverFocus.js'

/**
 * Cover framing: the merchant drags a product photo inside a card-shaped frame
 * and the card shows the same part of it. The maths decides whether the photo
 * follows the finger — and whether the card ends up showing what the merchant
 * saw.
 */

test('focusPosition: a set point becomes the object-position, unset keeps the card default', () => {
  assert.equal(focusPosition({ x: 30, y: 10 }), '30% 10%')
  assert.equal(focusPosition(null), '50% 50%')
  // The classic card has always shown the top of the photo.
  assert.equal(focusPosition(null, '50% 0%'), '50% 0%')
  assert.equal(focusPosition({ x: 150, y: -5 }), '100% 0%')
})

test('coverOverflow: a tall photo in a square frame slides only vertically', () => {
  // 1000×2000 into 200×200: scaled to 200×400, 200px to spare vertically.
  assert.deepEqual(coverOverflow(1000, 2000, 200, 200), { x: 0, y: 200 })
  // A wide photo slides only horizontally.
  assert.deepEqual(coverOverflow(3000, 1000, 300, 300), { x: 600, y: 0 })
  // Not loaded yet: nothing to slide.
  assert.deepEqual(coverOverflow(0, 0, 300, 300), { x: 0, y: 0 })
})

test('dragFocus: dragging the photo down reveals its top, so y falls', () => {
  const overflow = { x: 0, y: 200 }
  assert.deepEqual(dragFocus(CENTER, 0, 100, overflow), { x: 50, y: 0 })
  assert.deepEqual(dragFocus(CENTER, 0, -100, overflow), { x: 50, y: 100 })
  assert.deepEqual(dragFocus(CENTER, 0, 50, overflow), { x: 50, y: 25 })
})

test('dragFocus: an axis with nothing to reveal does not move, and nothing leaves 0-100', () => {
  const overflow = { x: 0, y: 200 }
  // Sideways drag on a tall photo: x stays where it was.
  assert.equal(dragFocus({ x: 50, y: 50 }, 80, 0, overflow).x, 50)
  // Dragging far past the edge stops at the edge.
  assert.equal(dragFocus({ x: 50, y: 50 }, 0, 5000, overflow).y, 0)
  assert.equal(dragFocus({ x: 50, y: 50 }, 0, -5000, overflow).y, 100)
})
