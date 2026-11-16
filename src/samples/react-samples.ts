/* ================================================================
   Built-in TSX + CSS Component Samples for Component Studio (src/samples/react-samples.ts)
   Pure Layer 1 module — 0 DOM dependencies, 0 type escape hatches.
   ================================================================ */

export interface ReactSampleItem {
  id: string;
  fileName: string;
  cssFileName: string;
  title: string;
  description: string;
  code: string;
  cssCode: string;
}

export const REACT_SAMPLES: readonly ReactSampleItem[] = [
  {
    id: 'button',
    fileName: 'Button.tsx',
    cssFileName: 'Button.css',
    title: 'Button · 交互按钮',
    description: '支持视觉变体、尺寸、加载态与点击回调的现代按钮组件',
    code: `import React, { useState } from 'react';
import './Button.css';

export interface ButtonProps {
  /** 按钮显示文案 */
  label: string;
  /** 视觉风格变体 */
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 圆角半径 (px) */
  radius?: number;
  /** 禁用状态 */
  disabled?: boolean;
  /** 加载中状态 */
  loading?: boolean;
  /** 点击事件回调 */
  onClick?: () => void;
}

export function Button({
  label = '立即体验',
  variant = 'primary',
  size = 'md',
  radius = 10,
  disabled = false,
  loading = false,
  onClick,
}: ButtonProps) {
  const [clicks, setClicks] = useState(0);
  const isBlocked = disabled || loading;

  const classList = [
    'sb-btn',
    'sb-btn--' + variant,
    'sb-btn--' + size,
    loading ? 'is-loading' : '',
    isBlocked ? 'is-blocked' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classList}
      disabled={isBlocked}
      style={{ borderRadius: radius }}
      onClick={() => {
        if (isBlocked) return;
        setClicks((c) => c + 1);
        if (onClick) onClick();
      }}
    >
      {loading ? <span className="sb-btn__spinner" aria-hidden="true" /> : null}
      <span className="sb-btn__label">{loading ? '处理中...' : label}</span>
      {clicks > 0 && !loading ? (
        <span className="sb-btn__count">{clicks}</span>
      ) : null}
    </button>
  );
}
`,
    cssCode: `/* Button 组件样式 (Button.css) — 修改后右侧预览即时热更新 */
.sb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  font-weight: 600;
  letter-spacing: 0.01em;
  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  transition:
    transform 0.14s cubic-bezier(0.4, 0, 0.2, 1),
    background-color 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.sb-btn--sm {
  padding: 7px 14px;
  font-size: 13px;
}

.sb-btn--md {
  padding: 10px 20px;
  font-size: 14px;
}

.sb-btn--lg {
  padding: 13px 28px;
  font-size: 16px;
}

.sb-btn--primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #ffffff;
  border-color: rgba(96, 165, 250, 0.55);
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.28);
}

.sb-btn--primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.44);
  transform: translateY(-1px);
}

.sb-btn--secondary {
  background: #1e293b;
  color: #f8fafc;
  border-color: #475569;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.25);
}

.sb-btn--secondary:hover:not(:disabled) {
  background: #334155;
  transform: translateY(-1px);
}

.sb-btn--outline {
  background: transparent;
  color: #3b82f6;
  border: 1.5px solid #3b82f6;
}

.sb-btn--outline:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.12);
}

.sb-btn--danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #ffffff;
  border-color: rgba(248, 113, 113, 0.5);
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.25);
}

.sb-btn--danger:hover:not(:disabled) {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  box-shadow: 0 8px 24px rgba(239, 68, 68, 0.42);
  transform: translateY(-1px);
}

.sb-btn:active:not(:disabled) {
  transform: scale(0.96);
}

.sb-btn.is-blocked,
.sb-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.sb-btn__spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid currentColor;
  border-right-color: transparent;
  animation: sb-btn-spin 0.72s linear infinite;
}

.sb-btn__count {
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.22);
}

@keyframes sb-btn-spin {
  to {
    transform: rotate(360deg);
  }
}
`,
  },
  {
    id: 'badge',
    fileName: 'Badge.tsx',
    cssFileName: 'Badge.css',
    title: 'Badge · 状态徽章',
    description: '带呼吸状态点与可关闭交互的语义化标签徽章',
    code: `import React from 'react';
import './Badge.css';

export interface BadgeProps {
  /** 徽章文本 */
  text: string;
  /** 语义色调 */
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  /** 是否显示状态圆点 */
  dot?: boolean;
  /** 药丸全圆角 */
  pill?: boolean;
  /** 允许点击关闭 */
  closable?: boolean;
  /** 点击关闭图标时触发 */
  onClose?: () => void;
}

export function Badge({
  text = 'Production Ready',
  tone = 'info',
  dot = true,
  pill = true,
  closable = false,
  onClose,
}: BadgeProps) {
  const cls = [
    'sb-badge',
    'sb-badge--' + tone,
    pill ? 'is-pill' : 'is-square',
  ].join(' ');

  return (
    <span className={cls}>
      {dot ? <span className="sb-badge__dot" /> : null}
      <span className="sb-badge__text">{text}</span>
      {closable ? (
        <button
          type="button"
          className="sb-badge__close"
          onClick={() => onClose && onClose()}
          aria-label="关闭"
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
`,
    cssCode: `/* Badge 组件样式 (Badge.css) */
.sb-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  border: 1px solid transparent;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.sb-badge:hover {
  transform: translateY(-1px);
}

.sb-badge.is-pill {
  border-radius: 999px;
}

.sb-badge.is-square {
  border-radius: 8px;
}

.sb-badge--info {
  background: rgba(56, 189, 248, 0.14);
  color: #0284c7;
  border-color: rgba(56, 189, 248, 0.38);
  --sb-dot-color: #0ea5e9;
}

.sb-badge--success {
  background: rgba(34, 197, 94, 0.14);
  color: #16a34a;
  border-color: rgba(34, 197, 94, 0.38);
  --sb-dot-color: #22c55e;
}

.sb-badge--warning {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
  border-color: rgba(245, 158, 11, 0.42);
  --sb-dot-color: #f59e0b;
}

.sb-badge--danger {
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
  border-color: rgba(239, 68, 68, 0.38);
  --sb-dot-color: #ef4444;
}

.sb-badge--neutral {
  background: rgba(148, 163, 184, 0.16);
  color: #475569;
  border-color: rgba(148, 163, 184, 0.38);
  --sb-dot-color: #64748b;
}

.sb-badge__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--sb-dot-color, currentColor);
  animation: sb-badge-pulse 1.8s ease-in-out infinite;
}

.sb-badge__close {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0 3px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1;
  opacity: 0.72;
  transition: opacity 0.14s ease, background-color 0.14s ease;
}

.sb-badge__close:hover {
  opacity: 1;
  background: rgba(15, 23, 42, 0.08);
}

@keyframes sb-badge-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.35);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(56, 189, 248, 0);
    transform: scale(1.14);
  }
}
`,
  },
  {
    id: 'pricing-card',
    fileName: 'PricingCard.tsx',
    cssFileName: 'PricingCard.css',
    title: 'PricingCard · 定价卡片',
    description: '含推荐角标、动态折扣计算与 CTA 回调的 SaaS 定价卡片',
    code: `import React from 'react';
import './PricingCard.css';

export interface PricingCardProps {
  /** 套餐名称 */
  planName: string;
  /** 月付单价 (USD) */
  price: number;
  /** 计费周期 */
  cycle?: 'monthly' | 'yearly';
  /** 套餐简述 */
  subtitle?: string;
  /** 高亮为推荐方案 */
  featured?: boolean;
  /** 按钮文案 */
  ctaLabel?: string;
  /** 点击订阅按钮回调 */
  onSelect?: () => void;
}

export function PricingCard({
  planName = 'Pro Studio',
  price = 29,
  cycle = 'monthly',
  subtitle = '为个人开发者与设计工程师打造的全功能组件工坊',
  featured = true,
  ctaLabel = '升级到 Pro',
  onSelect,
}: PricingCardProps) {
  const displayPrice = cycle === 'yearly' ? Math.round(price * 0.8) : price;
  const features = [
    '无限隔离沙箱预览',
    '自动 Props Schema 面板',
    '多视口响应式切换',
    '一键复制 JSX 调用代码',
  ];

  return (
    <div className={featured ? 'sb-pricing-card is-featured' : 'sb-pricing-card'}>
      <div className="sb-pricing-head">
        <span className="sb-pricing-name">{planName}</span>
        {featured ? <span className="sb-pricing-badge">推荐方案</span> : null}
      </div>

      <p className="sb-pricing-subtitle">{subtitle}</p>

      <div className="sb-pricing-price-row">
        <span className="sb-pricing-amount">{'$' + displayPrice}</span>
        <span className="sb-pricing-cycle">
          {cycle === 'yearly' ? '/ 月 (年付 8 折)' : '/ 月'}
        </span>
      </div>

      <ul className="sb-pricing-list">
        {features.map((item) => (
          <li key={item} className="sb-pricing-item">
            <span className="sb-pricing-check">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="sb-pricing-cta"
        onClick={() => onSelect && onSelect()}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
`,
    cssCode: `/* PricingCard 组件样式 (PricingCard.css) */
.sb-pricing-card {
  width: 310px;
  padding: 24px;
  border-radius: 16px;
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #e2e8f0;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.sb-pricing-card:hover {
  transform: translateY(-2px);
}

.sb-pricing-card.is-featured {
  background: linear-gradient(160deg, #0f172a 0%, #1e293b 100%);
  color: #f8fafc;
  border: 1.5px solid #38bdf8;
  box-shadow: 0 20px 44px rgba(15, 23, 42, 0.35);
}

.sb-pricing-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.sb-pricing-name {
  font-size: 18px;
  font-weight: 700;
}

.sb-pricing-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.18);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.4);
  animation: sb-badge-glow 2.4s ease-in-out infinite;
}

.sb-pricing-subtitle {
  margin: 0 0 18px 0;
  font-size: 13px;
  line-height: 1.5;
  color: #64748b;
}

.sb-pricing-card.is-featured .sb-pricing-subtitle {
  color: #94a3b8;
}

.sb-pricing-price-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 18px;
}

.sb-pricing-amount {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.sb-pricing-cycle {
  font-size: 13px;
  color: #64748b;
}

.sb-pricing-card.is-featured .sb-pricing-cycle {
  color: #94a3b8;
}

.sb-pricing-list {
  list-style: none;
  padding: 0;
  margin: 0 0 20px 0;
  display: grid;
  gap: 9px;
}

.sb-pricing-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.sb-pricing-check {
  color: #22c55e;
  font-weight: 700;
}

.sb-pricing-cta {
  width: 100%;
  padding: 11px 16px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  background: #0f172a;
  color: #ffffff;
  transition: transform 0.15s ease, filter 0.15s ease;
}

.sb-pricing-card.is-featured .sb-pricing-cta {
  background: #38bdf8;
  color: #0f172a;
}

.sb-pricing-cta:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.sb-pricing-cta:active {
  transform: scale(0.98);
}

@keyframes sb-badge-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.25);
  }
  50% {
    box-shadow: 0 0 12px 1px rgba(56, 189, 248, 0.45);
  }
}
`,
  },
];

export function getReactSampleById(id: string): ReactSampleItem | undefined {
  return REACT_SAMPLES.find((s) => s.id === id);
}
