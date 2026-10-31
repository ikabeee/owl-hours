import assert from 'node:assert/strict';
import { it } from 'node:test';
import { resolveStoryPackConfig } from '../services/storyPackConfig.ts';

it('never silently chooses demo when live configuration is missing', () => {
  assert.equal(resolveStoryPackConfig({}).mode, 'unconfigured');
  assert.equal(resolveStoryPackConfig({mode:'demo'}).mode, 'demo');
  assert.equal(resolveStoryPackConfig({apiUrl:'http://localhost:3000',supabaseUrl:'http://127.0.0.1:54321',anonKey:'public-key'}).mode,'live');
  assert.equal(resolveStoryPackConfig({apiUrl:'http://example.com',supabaseUrl:'https://project.supabase.co',anonKey:'public-key'}).mode,'unconfigured');
});
