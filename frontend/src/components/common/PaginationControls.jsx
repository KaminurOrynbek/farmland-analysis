import React from 'react';
import { t } from '../../i18n.js';

const clampPage = (currentPage, totalPages) => (
  Math.min(Math.max(Number(currentPage) || 1, 1), totalPages)
);

export default function PaginationControls({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = 'items'
}) {
  if (!totalItems) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = clampPage(currentPage, totalPages);
  const startItem = (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  return (
    <div style={paginationShellStyle}>
      <span className="workspace-helper-text" style={summaryStyle}>
        {t('Showing {start}-{end} of {total} {itemLabel}', {
          start: startItem,
          end: endItem,
          total: totalItems,
          itemLabel: t(itemLabel)
        })}
      </span>

      <div style={controlsStyle}>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
        >
          {t('Previous')}
        </button>

        <span style={pageLabelStyle}>
          {t('Page {current} of {total}', {
            current: safeCurrentPage,
            total: totalPages
          })}
        </span>

        <button
          type="button"
          className="secondary-btn"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages}
        >
          {t('Next')}
        </button>
      </div>
    </div>
  );
}

const paginationShellStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  flexWrap: 'wrap',
  paddingTop: '16px',
  marginTop: '16px',
  borderTop: '1px solid var(--border-color)'
};

const summaryStyle = {
  margin: 0
};

const controlsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  flexWrap: 'wrap'
};

const pageLabelStyle = {
  fontSize: '0.9rem',
  fontWeight: 700,
  color: 'var(--text-primary)'
};
