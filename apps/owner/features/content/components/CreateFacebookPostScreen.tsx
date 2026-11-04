'use dom';

import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import '../../../shared/theme/figtreeStylesheet';
import '../../../shared/theme/zukki-theme.css';

import type { DOMProps } from 'expo/dom';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { VStack } from '@astryxdesign/core/Layout';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { contentCopys } from '../copys/contentCopys';
import type { FacebookPageOption } from '../hooks/useCreateFacebookPost';
import ContentTopBar from './ContentTopBar';

export default function CreateFacebookPostScreen(props: {
  pages: FacebookPageOption[];
  selectedPageId: string;
  prompt: string;
  canGenerate: boolean;
  isGenerating: boolean;
  error: string | null;
  insets: { top: number; bottom: number };
  onBack: () => Promise<void>;
  onSelectPage: (id: string) => void;
  onPromptChange: (prompt: string) => void;
  onManageAccounts: () => Promise<void>;
  onGenerate: () => Promise<void>;
  dom?: DOMProps;
}) {
  const { insets } = props;

  return (
    <Theme theme={neutralTheme}>
      <div
        className="zukki-root"
        style={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-background-body)',
        }}
      >
        <ContentTopBar
          title={contentCopys.createFacebookPostTitle}
          subtitle={contentCopys.createFacebookPostSubtitle}
          onBack={props.onBack}
        />
        <VStack gap={3} padding={4}>
          <Text style={{ fontSize: 16, lineHeight: 1.5 }}>{contentCopys.museReviewNotice}</Text>

          {props.pages.length === 0 ? (
            <Card padding={4}>
              <VStack gap={3}>
                <Text style={{ fontSize: 16 }}>{contentCopys.noFacebookPages}</Text>
                <Button
                  label={contentCopys.connectFacebookPage}
                  variant="secondary"
                  size="lg"
                  onClick={() => void props.onManageAccounts()}
                />
              </VStack>
            </Card>
          ) : (
            <Card padding={4}>
              <VStack gap={3}>
                <label style={{ display: 'grid', gap: 8, fontSize: 16, fontWeight: 600 }}>
                  {contentCopys.facebookPageLabel}
                  <select
                    value={props.selectedPageId}
                    onChange={(event) => props.onSelectPage(event.target.value)}
                    style={{
                      minHeight: 48,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border-emphasized)',
                      fontSize: 16,
                      fontFamily: 'inherit',
                    }}
                  >
                    {props.pages.length !== 1 && <option value="">{contentCopys.chooseFacebookPage}</option>}
                    {props.pages.map((page) => <option key={page.id} value={page.id}>{page.name}</option>)}
                  </select>
                </label>

                <label style={{ display: 'grid', gap: 8, fontSize: 16, fontWeight: 600 }}>
                  {contentCopys.postPromptLabel}
                  <textarea
                    value={props.prompt}
                    onChange={(event) => props.onPromptChange(event.target.value)}
                    placeholder={contentCopys.postPromptHint}
                    maxLength={1000}
                    rows={5}
                    style={{
                      width: '100%',
                      minHeight: 120,
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid var(--color-border-emphasized)',
                      fontSize: 16,
                      lineHeight: 1.5,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </label>
              </VStack>
            </Card>
          )}

          {props.error && <Text style={{ color: 'var(--color-error)', fontSize: 16 }}>{props.error}</Text>}
        </VStack>

        {props.pages.length > 0 && (
          <div
            style={{
              marginTop: 'auto',
              background: 'var(--color-background-card)',
              borderTop: '1px solid var(--color-border)',
              padding: '12px 16px',
            }}
          >
            <Button
              label={props.isGenerating ? contentCopys.generatingPost : contentCopys.generatePost}
              variant="primary"
              size="lg"
              isDisabled={!props.canGenerate}
              isLoading={props.isGenerating}
              onClick={() => void props.onGenerate()}
            />
          </div>
        )}
      </div>
    </Theme>
  );
}
