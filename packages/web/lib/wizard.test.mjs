import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { secretsHref } from './workflow.ts'
import { previewUrlHidden, secretsLinkProps, stepBodyClass, stepConnectorClass, urlField } from './wizard.ts'

describe('url fields', () => {
  test('a valid URL clears the message and a rejected one shows it', () => {
    assert.deepEqual(urlField(true, 'Use a full address'), { invalid: false, message: '' })
    assert.deepEqual(urlField(false, 'Use a full address'), { invalid: true, message: 'Use a full address' })
  })

  test('the preview URL field is hidden until the preview is a fixed URL', () => {
    assert.equal(previewUrlHidden('vercel'), true)
    assert.equal(previewUrlHidden('url'), false)
  })
})

describe('step connector', () => {
  test('the last step hides the dotted connector', () => {
    assert.equal(stepBodyClass(true), 'min-w-0')
    assert.equal(stepBodyClass(false), 'min-w-0 pb-16 sm:pb-20')
    assert.equal(stepConnectorClass(true), 'hidden')
    assert.match(stepConnectorClass(false), /border-dotted/)
    assert.doesNotMatch(stepConnectorClass(false), /hidden/)
  })
})

describe('secrets link', () => {
  test('an owner/name opens the new-secret page and anything else is not a link', () => {
    const active = secretsLinkProps(secretsHref(' microlinkhq/difftool '))
    assert.equal(active.href, 'https://github.com/microlinkhq/difftool/settings/secrets/actions/new')
    assert.equal('tabIndex' in active, false)
    assert.equal('aria-disabled' in active, false)

    const inactive = secretsLinkProps(secretsHref('not a repo'))
    assert.equal(inactive.href, undefined)
    assert.equal(inactive.tabIndex, -1)
    assert.equal(inactive['aria-disabled'], true)
    assert.match(inactive.className, /pointer-events-none/)
  })
})
