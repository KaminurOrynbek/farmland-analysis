import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Clock3, Lock, MapPinned, MessageSquare, Send, X } from 'lucide-react';
import { createFieldComment, fetchFieldComments } from '../../api/client';
import { getFieldPermissions } from '../../permissions/permissions';

const formatDateTime = (value, options) => {
  if (!value) {
    return 'Unknown time';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unknown time';
  }

  return parsedDate.toLocaleString(undefined, options);
};

const formatFullDateTime = (value) => (
  formatDateTime(value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
);

const formatTime = (value) => (
  formatDateTime(value, {
    hour: 'numeric',
    minute: '2-digit'
  })
);

const formatGroupLabel = (value) => {
  if (!value) {
    return 'Recent';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Recent';
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const commentDay = new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate()
  );
  const differenceInDays = Math.round((today - commentDay) / 86400000);

  if (differenceInDays === 0) {
    return 'Today';
  }

  if (differenceInDays === 1) {
    return 'Yesterday';
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(parsedDate.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {})
  });
};

const getCommentAuthor = (comment) => {
  if (comment?.author?.full_name) {
    return comment.author.full_name;
  }

  if (comment?.author?.email) {
    return comment.author.email;
  }

  if (comment?.author_name) {
    return comment.author_name;
  }

  if (comment?.author_email) {
    return comment.author_email;
  }

  if (comment?.author_id) {
    return `User ${String(comment.author_id).slice(0, 8)}`;
  }

  return 'Field collaborator';
};

const getAuthorInitials = (comment) => {
  const author = getCommentAuthor(comment);
  const parts = author.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'FC';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
};

const getCommentText = (comment) => (
  comment?.comment || comment?.comment_text || 'No comment text provided.'
);

const getMarkersCount = (comment) => (
  Array.isArray(comment?.markers) ? comment.markers.length : 0
);

export default function FieldCommentsPanel({
  user,
  fieldId,
  selectedField,
  hasGeometry
}) {
  const [comments, setComments] = useState([]);
  const [draftComment, setDraftComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const permissions = getFieldPermissions(selectedField?.properties || selectedField, user);
  const canComment = permissions.canComment;
  const isAgronomist = user?.role === 'AGRONOMIST';

  const fieldName = useMemo(
    () =>
      selectedField?.properties?.name ||
      selectedField?.name ||
      'Selected field',
    [selectedField]
  );

  const sortedComments = useMemo(() => (
    [...comments].sort((left, right) => (
      new Date(right?.created_at || 0).getTime() - new Date(left?.created_at || 0).getTime()
    ))
  ), [comments]);

  const commentGroups = useMemo(() => {
    const groups = [];
    const groupedComments = new Map();

    sortedComments.forEach((comment, index) => {
      const label = formatGroupLabel(comment.created_at);
      const existingGroup = groupedComments.get(label);
      const enrichedComment = {
        ...comment,
        _commentKey: comment.id || `${comment.created_at || 'recent'}-${index}`
      };

      if (existingGroup) {
        existingGroup.items.push(enrichedComment);
        return;
      }

      const nextGroup = {
        label,
        items: [enrichedComment]
      };

      groupedComments.set(label, nextGroup);
      groups.push(nextGroup);
    });

    return groups;
  }, [sortedComments]);

  const latestComment = sortedComments[0] || null;
  const totalMarkers = useMemo(
    () => sortedComments.reduce((total, comment) => total + getMarkersCount(comment), 0),
    [sortedComments]
  );

  const loadComments = useCallback(async (nextFieldId = fieldId) => {
    if (!nextFieldId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetchFieldComments(nextFieldId);
      setComments(Array.isArray(response) ? response : response?.data || []);
    } catch (requestError) {
      setComments([]);
      setError(requestError.response?.data?.detail || 'Failed to load field comments.');
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  useEffect(() => {
    if (!fieldId) {
      const timeoutId = window.setTimeout(() => {
        setComments([]);
        setError('');
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      void loadComments(fieldId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fieldId, loadComments]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDraftComment('');
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fieldId]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!fieldId || !draftComment.trim()) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await createFieldComment({
        fieldId,
        content: draftComment.trim(),
        markers: []
      });

      setDraftComment('');
      await loadComments(fieldId);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Failed to add comment.');
    } finally {
      setSaving(false);
    }
  };

  if (!hasGeometry && !fieldId) {
    return null;
  }

  return (
    <div style={dockStyle}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        style={toggleButtonStyle}
        aria-label={isOpen ? 'Collapse field comments' : 'Open field comments'}
      >
        <span style={toggleButtonIconWrapStyle}>
          <MessageSquare size={18} />
        </span>
        <span style={toggleButtonCopyStyle}>
          <strong style={{ fontSize: '0.84rem' }}>{isAgronomist ? 'Notes' : 'Comments'}</strong>
          <span style={toggleButtonMetaStyle}>
            {loading ? 'Syncing...' : `${sortedComments.length} note${sortedComments.length === 1 ? '' : 's'}`}
          </span>
        </span>
        <span style={toggleCountStyle}>{sortedComments.length}</span>
        <ChevronRight
          size={16}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        />
      </button>

      {isOpen && (
        <aside className="glass-panel" style={panelStyle}>
          <div style={headerStyle}>
            <div>
              <div className="section-kicker">{isAgronomist ? 'Expert Notes' : 'Field Comments'}</div>
              <h2 style={{ marginTop: '10px', fontSize: '1.08rem' }}>{fieldName}</h2>
            </div>

            <div style={headerActionsStyle}>
              <span className="status-pill neutral">
                <MessageSquare size={14} />
                {sortedComments.length}
              </span>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={closeButtonStyle}
                aria-label="Close field comments"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!fieldId ? (
            <div style={noticeStyle}>
              Save this field first to load and post comments for your team.
            </div>
          ) : (
            <>
              <div style={summaryGridStyle}>
                <div style={summaryCardStyle}>
                  <span style={summaryLabelStyle}>Discussion</span>
                  <strong style={summaryValueStyle}>
                    {loading && sortedComments.length === 0
                      ? 'Loading...'
                      : `${sortedComments.length} note${sortedComments.length === 1 ? '' : 's'}`}
                  </strong>
                </div>

                <div style={summaryCardStyle}>
                  <span style={summaryLabelStyle}>Last update</span>
                  <strong style={summaryDetailStyle}>
                    {latestComment ? formatFullDateTime(latestComment.created_at) : 'No activity yet'}
                  </strong>
                </div>

                <div style={summaryCardStyle}>
                  <span style={summaryLabelStyle}>Markers</span>
                  <strong style={summaryValueStyle}>{totalMarkers}</strong>
                </div>

                <div style={summaryCardStyle}>
                  <span style={summaryLabelStyle}>Access</span>
                  <strong style={summaryDetailStyle}>
                    {canComment ? 'Can post notes' : 'Read only'}
                  </strong>
                </div>
              </div>

              {error && <div style={noticeStyle}>{error}</div>}

              <section style={discussionSectionStyle}>
                <div style={discussionHeaderStyle}>
                  <div>
                    <h3 style={discussionTitleStyle}>Discussion</h3>
                    <p style={discussionCopyStyle}>
                      {sortedComments.length > 0
                        ? isAgronomist
                          ? 'Recent expert conclusions stay at the top so the latest recommendation is easy to review.'
                          : 'Recent field notes stay at the top so new updates are easier to scan.'
                        : isAgronomist
                          ? 'Capture agronomic conclusions, follow-up actions, and treatment advice while reviewing this field.'
                          : 'Capture issues, observations, and next steps while reviewing this field.'}
                    </p>
                  </div>

                  <span style={discussionStatusStyle}>
                    <Clock3 size={13} />
                    {loading ? 'Syncing' : `${sortedComments.length} total`}
                  </span>
                </div>

                {loading && sortedComments.length === 0 ? (
                  <div style={emptyStyle}>Loading comments...</div>
                ) : sortedComments.length === 0 ? (
                  <div style={emptyStyle}>
                    No comments yet. Add the first field note so your team has a clear discussion trail.
                  </div>
                ) : (
                  <div style={commentsListStyle}>
                    {commentGroups.map((group) => (
                      <section key={group.label} style={commentGroupStyle}>
                        <div style={commentGroupLabelStyle}>{group.label}</div>

                        <div style={commentGroupItemsStyle}>
                          {group.items.map((comment) => {
                            const markersCount = getMarkersCount(comment);

                            return (
                              <article key={comment._commentKey} style={commentCardStyle}>
                                <div style={commentTopRowStyle}>
                                  <div style={commentIdentityStyle}>
                                    <div style={avatarStyle}>{getAuthorInitials(comment)}</div>

                                    <div style={commentMetaColumnStyle}>
                                      <strong style={authorNameStyle}>{getCommentAuthor(comment)}</strong>
                                      <span style={metaTextStyle}>{formatTime(comment.created_at)}</span>
                                    </div>
                                  </div>

                                  <span
                                    style={{
                                      ...markerBadgeStyle,
                                      background:
                                        markersCount > 0
                                          ? 'rgba(59, 130, 246, 0.14)'
                                          : 'rgba(148, 163, 184, 0.08)',
                                      color: markersCount > 0 ? '#bfdbfe' : 'var(--text-secondary)'
                                    }}
                                  >
                                    <MapPinned size={12} />
                                    {markersCount > 0
                                      ? `${markersCount} marker${markersCount === 1 ? '' : 's'}`
                                      : 'No markers'}
                                  </span>
                                </div>

                                <p style={commentBodyStyle}>{getCommentText(comment)}</p>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </section>

              <form onSubmit={handleSubmit} style={composerStyle}>
                <div style={composerHeaderStyle}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.94rem' }}>{isAgronomist ? 'Write report' : 'Add comment'}</h3>
                    <p style={composerHelperStyle}>
                      {canComment
                        ? isAgronomist
                          ? 'Leave an expert conclusion, highlight what the farmer should do next, or attach a recommendation note.'
                          : 'Share what changed, what needs attention, or what the next action should be.'
                        : 'You can review the note history, but your current field role cannot post new comments.'}
                    </p>
                  </div>

                  <span style={canComment ? composerBadgeStyle : readOnlyBadgeStyle}>
                    {canComment ? (
                      <>
                        <MessageSquare size={13} />
                        Can comment
                      </>
                    ) : (
                      <>
                        <Lock size={13} />
                        Read only
                      </>
                    )}
                  </span>
                </div>

                <textarea
                  value={draftComment}
                  onChange={(event) => setDraftComment(event.target.value)}
                  placeholder={
                    canComment
                      ? isAgronomist
                        ? 'Example: Add nitrogen fertiliser on the north-west stress zone before the next irrigation cycle.'
                        : 'Share an observation, issue, or recommendation for this field.'
                      : 'Viewer access can read comment history but cannot add new comments.'
                  }
                  style={textareaStyle}
                  rows={4}
                  disabled={!canComment || !fieldId || saving}
                />

                <div style={composerFooterStyle}>
                  <span style={metaTextStyle}>
                    {canComment
                      ? `${draftComment.trim().length} characters`
                      : 'Marker attachments will be added in a future update.'}
                  </span>

                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={!canComment || !fieldId || !draftComment.trim() || saving}
                    style={submitButtonStyle}
                  >
                    <Send size={15} />
                    {saving ? 'Posting...' : isAgronomist ? 'Save Report Note' : 'Post Comment'}
                  </button>
                </div>
              </form>
            </>
          )}
        </aside>
      )}
    </div>
  );
}

const dockStyle = {
  position: 'absolute',
  top: '24px',
  right: '24px',
  zIndex: 900,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '12px'
};

const toggleButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  minWidth: '228px',
  padding: '12px 14px',
  borderRadius: '18px',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  background: 'rgba(15, 23, 42, 0.82)',
  color: 'var(--text-primary)',
  boxShadow: '0 14px 32px rgba(2, 6, 23, 0.32)',
  cursor: 'pointer',
  backdropFilter: 'blur(22px)'
};

const toggleButtonIconWrapStyle = {
  width: '40px',
  height: '40px',
  borderRadius: '14px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(59, 130, 246, 0.16)',
  color: '#bfdbfe',
  flexShrink: 0
};

const toggleButtonCopyStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '4px',
  flex: 1,
  minWidth: 0
};

const toggleButtonMetaStyle = {
  color: 'var(--text-secondary)',
  fontSize: '0.74rem'
};

const toggleCountStyle = {
  minWidth: '28px',
  height: '28px',
  borderRadius: '999px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(59, 130, 246, 0.18)',
  color: '#dbeafe',
  fontSize: '0.78rem',
  fontWeight: 700,
  flexShrink: 0
};

const panelStyle = {
  width: 'min(380px, calc(100vw - 72px))',
  maxHeight: 'min(760px, calc(100vh - 190px))',
  padding: '20px',
  borderRadius: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  overflow: 'hidden'
};

const headerStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '16px'
};

const headerActionsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
};

const closeButtonStyle = {
  width: '38px',
  height: '38px',
  borderRadius: '12px',
  border: '1px solid rgba(148, 163, 184, 0.14)',
  background: 'rgba(148, 163, 184, 0.08)',
  color: 'var(--text-secondary)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer'
};

const noticeStyle = {
  padding: '12px 14px',
  borderRadius: '14px',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  background: 'rgba(148, 163, 184, 0.08)',
  color: 'var(--text-secondary)',
  lineHeight: 1.55
};

const summaryGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '10px'
};

const summaryCardStyle = {
  padding: '12px 14px',
  borderRadius: '16px',
  border: '1px solid rgba(148, 163, 184, 0.14)',
  background: 'rgba(15, 23, 42, 0.28)',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const summaryLabelStyle = {
  color: 'var(--text-secondary)',
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
};

const summaryValueStyle = {
  fontSize: '0.94rem',
  lineHeight: 1.35
};

const summaryDetailStyle = {
  fontSize: '0.8rem',
  lineHeight: 1.5
};

const emptyStyle = {
  padding: '16px',
  borderRadius: '16px',
  border: '1px dashed rgba(148, 163, 184, 0.22)',
  color: 'var(--text-secondary)',
  textAlign: 'center',
  lineHeight: 1.55
};

const discussionSectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  minHeight: 0,
  flex: 1
};

const discussionHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '12px'
};

const discussionTitleStyle = {
  margin: 0,
  fontSize: '0.98rem'
};

const discussionCopyStyle = {
  marginTop: '6px',
  color: 'var(--text-secondary)',
  fontSize: '0.78rem',
  lineHeight: 1.55
};

const discussionStatusStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 10px',
  borderRadius: '999px',
  background: 'rgba(148, 163, 184, 0.08)',
  border: '1px solid rgba(148, 163, 184, 0.14)',
  color: 'var(--text-secondary)',
  fontSize: '0.74rem',
  whiteSpace: 'nowrap'
};

const commentsListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  overflowY: 'auto',
  paddingRight: '4px'
};

const commentGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

const commentGroupLabelStyle = {
  color: '#bfdbfe',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
};

const commentGroupItemsStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

const commentCardStyle = {
  padding: '14px',
  borderRadius: '18px',
  border: '1px solid rgba(148, 163, 184, 0.16)',
  background: 'rgba(15, 23, 42, 0.32)',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

const commentTopRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  alignItems: 'flex-start'
};

const commentIdentityStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  minWidth: 0
};

const avatarStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(59, 130, 246, 0.16)',
  border: '1px solid rgba(59, 130, 246, 0.24)',
  color: '#dbeafe',
  fontWeight: 700,
  fontSize: '0.78rem',
  flexShrink: 0
};

const commentMetaColumnStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  minWidth: 0
};

const authorNameStyle = {
  fontSize: '0.86rem',
  lineHeight: 1.35
};

const commentBodyStyle = {
  margin: 0,
  color: 'var(--text-primary)',
  lineHeight: 1.6,
  fontSize: '0.88rem',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word'
};

const markerBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 10px',
  borderRadius: '999px',
  fontSize: '0.72rem',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  flexShrink: 0
};

const composerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  paddingTop: '12px',
  borderTop: '1px solid rgba(148, 163, 184, 0.12)'
};

const composerHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  alignItems: 'flex-start'
};

const composerHelperStyle = {
  marginTop: '6px',
  color: 'var(--text-secondary)',
  fontSize: '0.78rem',
  lineHeight: 1.55
};

const composerBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 10px',
  borderRadius: '999px',
  background: 'rgba(59, 130, 246, 0.14)',
  border: '1px solid rgba(59, 130, 246, 0.22)',
  color: '#bfdbfe',
  fontSize: '0.74rem',
  whiteSpace: 'nowrap'
};

const readOnlyBadgeStyle = {
  ...composerBadgeStyle,
  background: 'rgba(148, 163, 184, 0.08)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  color: 'var(--text-secondary)'
};

const textareaStyle = {
  width: '100%',
  resize: 'vertical',
  minHeight: '96px',
  padding: '12px',
  borderRadius: '14px',
  background: 'rgba(15, 23, 42, 0.45)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  outline: 'none',
  lineHeight: 1.6
};

const composerFooterStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  alignItems: 'center'
};

const metaTextStyle = {
  color: 'var(--text-secondary)',
  fontSize: '0.74rem'
};

const submitButtonStyle = {
  padding: '10px 14px',
  minWidth: '142px'
};
