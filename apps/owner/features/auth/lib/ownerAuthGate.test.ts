// Spec: odd/tasks/crystal-pr-handoff-fixes.md, T1, S3 (auth gate, HANDOFF-RN-UI.md:246).
// Live mode without a session sends the owner to /onboarding/sign-up; demo mode never gates.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ownerAuthRedirect } from './ownerAuthGate.ts';

const live = { configured: true, loading: false, signedIn: false };

describe('ownerAuthRedirect', () => {
  it('S3 sends a signed-out owner in live mode to sign-up', () => {
    assert.equal(ownerAuthRedirect({ ...live, pathname: '/requests' }), '/onboarding/sign-up');
    assert.equal(ownerAuthRedirect({ ...live, pathname: '/chat/c1' }), '/onboarding/sign-up');
  });

  it('S3 lets a signed-out owner through every onboarding step', () => {
    for (const pathname of ['/onboarding/intro', '/onboarding/sign-up', '/onboarding/verify', '/onboarding/business']) {
      assert.equal(ownerAuthRedirect({ ...live, pathname }), null, pathname);
    }
  });

  it('S3 waits while the stored session is still being restored', () => {
    assert.equal(ownerAuthRedirect({ ...live, loading: true, pathname: '/requests' }), null);
  });

  it('S3 lets a signed-in owner through', () => {
    assert.equal(ownerAuthRedirect({ ...live, signedIn: true, pathname: '/requests' }), null);
  });

  it('S3 never gates demo mode', () => {
    assert.equal(ownerAuthRedirect({ configured: false, loading: false, signedIn: false, pathname: '/requests' }), null);
  });
});
