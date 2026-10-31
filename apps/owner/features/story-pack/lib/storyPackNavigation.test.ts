import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isBackNavigationDisabled } from './storyPack.ts';

describe('S14: story pack back navigation', () => {
  it('enables back navigation when idle', () => {
    assert.equal(
      isBackNavigationDisabled({
        saving: false,
        exporting: false,
        approving: false,
      }),
      false,
    );
  });

  it('disables back navigation while saving', () => {
    assert.equal(
      isBackNavigationDisabled({
        saving: true,
        exporting: false,
        approving: false,
      }),
      true,
    );
  });

  it('disables back navigation while exporting', () => {
    assert.equal(
      isBackNavigationDisabled({
        saving: false,
        exporting: true,
        approving: false,
      }),
      true,
    );
  });

  it('disables back navigation while approving', () => {
    assert.equal(
      isBackNavigationDisabled({
        saving: false,
        exporting: false,
        approving: true,
      }),
      true,
    );
  });
});
