import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, MapPinned, MessageSquare, Send } from 'lucide-react';
import { createFieldComment, fetchFieldComments } from '../../api/client';
import { getFieldPermissions } from '../../permissions/permissions';

const formatDateTime = (value) => {
  if (!value) {
    return 'Unknown time';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unknown time';
  }

  return parsedDate.toLocaleString();
};

const getCommentAuthor = (comment) => (
  comment?.author?.full_name ||
  comment?.author_name ||
  comment?.author?.email ||
  comment?.author_email ||
  'Field collaborator'
);

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
  hasGeometry,
  variant = 'panel'
}) {
  const [comments, setComments] = useState([]);
  const [draftComment, setDraftComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const permissions = getFieldPermissions(selectedField?.properties || selectedField, user);
  const canComment = permissions.canComment;
  const fieldName = useMemo(
    () => selectedField?.properties?.name || selectedField?.name || 'Selected field',
    [selectedField]
  );

  const sortedComments = useMemo(() => (
    [...comments].sort((left, right) => (
      new Date(right?.created_at || 0).getTime() - new Date(left?.created_at || 0).getTime()
    ))
  ), [comments]);

  const loadComments = useCallback(async (nextFieldId = fieldId) => {
    if (!nextFieldId) {
      setComments([]);
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

  const isEmbedded = variant === 'embedded';

  if (!isEmbedded && !hasGeometry && !fieldId) {
    return null;
  }

  const commentsBody = !fieldId ? (
    <div className="workspace-note-card">
      Save or select a field to view comments.
    </div>
  ) : (
    <div className="workspace-comments-body">
      {error ? (
        <div className="workspace-note-card" style={{ color: 'var(--status-warning)' }}>
          {error}
        </div>
      ) : null}

      <div className="workspace-comments-list" style={commentListStyle}>
        {loading ? (
          <div className="empty-state compact">Loading comments...</div>
        ) : sortedComments.length === 0 ? (
          <div className="workspace-note-card">
            No comments yet. Use this area for short field observations and monitoring notes.
          </div>
        ) : (
          sortedComments.map((comment) => (
            <article
              key={comment.id || `${comment.created_at}-${comment.author_id}`}
              style={commentCardStyle}
            >
              <div style={commentHeaderStyle}>
                <div>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>
                    {getCommentAuthor(comment)}
                  </strong>
                  <span style={metaTextStyle}>{formatDateTime(comment.created_at)}</span>
                </div>

                <span style={metaBadgeStyle}>
                  <MapPinned size={12} />
                  {getMarkersCount(comment)}
                </span>
              </div>

              <p style={commentTextStyle}>{getCommentText(comment)}</p>
            </article>
          ))
        )}
      </div>

      <form className="workspace-comments-composer" onSubmit={handleSubmit} style={composerStyle}>
        <div style={composerHeaderStyle}>
          <strong>{canComment ? 'Add comment' : 'Comments are read only'}</strong>
          <span style={canComment ? metaBadgeStyle : readOnlyBadgeStyle}>
            {canComment ? (
              <>
                <MessageSquare size={12} />
                Can comment
              </>
            ) : (
              <>
                <Lock size={12} />
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
              ? 'Write a short field update or monitoring note.'
              : 'Viewer access can read comments but cannot post new ones.'
          }
          rows={4}
          style={textareaStyle}
          disabled={!canComment || !fieldId || saving}
        />

        <button
          type="submit"
          className="primary-btn"
          disabled={!canComment || !fieldId || !draftComment.trim() || saving}
          style={{ justifyContent: 'center' }}
        >
          <Send size={15} />
          {saving ? 'Posting...' : 'Post Comment'}
        </button>
      </form>
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="workspace-comments-embedded" data-guide="field-comments">
        <div style={embeddedHeaderStyle}>
          <div>
            <strong style={{ display: 'block', marginBottom: '4px' }}>Field comments</strong>
            <span style={metaTextStyle}>{fieldId ? fieldName : 'Saved fields only'}</span>
          </div>

          <span className="status-pill neutral">
            <MessageSquare size={14} />
            {sortedComments.length}
          </span>
        </div>

        {commentsBody}
      </div>
    );
  }

  return (
    <section className="glass-panel workspace-comments-panel" style={panelStyle} data-guide="field-comments">
      <div style={headerStyle}>
        <div>
          <div className="page-kicker" style={{ marginBottom: '8px' }}>Field comments</div>
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{fieldName}</h2>
        </div>

        <span className="status-pill neutral">
          <MessageSquare size={14} />
          {sortedComments.length}
        </span>
      </div>

      {commentsBody}
    </section>
  );
}

const panelStyle = {
  padding: '18px',
  borderRadius: '18px',
  display: 'grid',
  gap: '14px'
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  alignItems: 'flex-start'
};

const embeddedHeaderStyle = {
  ...headerStyle,
  marginBottom: '12px'
};

const commentListStyle = {
  display: 'grid',
  gap: '10px'
};

const commentCardStyle = {
  padding: '12px',
  borderRadius: '14px',
  border: '1px solid var(--border-color)',
  background: 'rgba(255,255,255,0.02)'
};

const commentHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '10px',
  marginBottom: '8px'
};

const commentTextStyle = {
  margin: 0,
  color: 'var(--text-primary)',
  lineHeight: 1.55,
  fontSize: '0.9rem'
};

const metaTextStyle = {
  color: 'var(--text-secondary)',
  fontSize: '0.78rem'
};

const metaBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '5px 8px',
  borderRadius: '999px',
  background: 'rgba(148, 163, 184, 0.12)',
  color: 'var(--text-secondary)',
  fontSize: '0.74rem',
  whiteSpace: 'nowrap'
};

const readOnlyBadgeStyle = {
  ...metaBadgeStyle,
  color: '#fbbf24'
};

const composerStyle = {
  display: 'grid',
  gap: '10px',
  borderTop: '1px solid var(--border-color)',
  paddingTop: '14px'
};

const composerHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '10px',
  alignItems: 'center'
};

const textareaStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '12px',
  background: 'rgba(15, 23, 42, 0.42)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  resize: 'vertical',
  outline: 'none'
};
