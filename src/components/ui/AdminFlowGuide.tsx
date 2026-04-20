import type { ReactNode } from 'react';
import { ArrowRight, CheckCircle2, Circle, CircleDot } from 'lucide-react';

type AdminFlowStatus = 'complete' | 'current' | 'upcoming';

interface AdminFlowBreadcrumb {
  label: string;
  current?: boolean;
}

interface AdminFlowStep {
  label: string;
  helper: string;
  status: AdminFlowStatus;
}

interface AdminFlowContextItem {
  label: string;
  value: string;
  tone?: 'blue' | 'green' | 'amber' | 'slate';
}

interface AdminFlowGuideProps {
  eyebrow?: string;
  title: string;
  description: string;
  breadcrumbs?: AdminFlowBreadcrumb[];
  steps?: AdminFlowStep[];
  contextItems?: AdminFlowContextItem[];
  asideTitle?: string;
  asideDescription?: string;
  actions?: ReactNode;
}

const STATUS_ICON = {
  complete: CheckCircle2,
  current: CircleDot,
  upcoming: Circle,
} satisfies Record<AdminFlowStatus, typeof CheckCircle2>;

export function AdminFlowGuide({
  eyebrow = 'Ruta guiada',
  title,
  description,
  breadcrumbs = [],
  steps = [],
  contextItems = [],
  asideTitle,
  asideDescription,
  actions,
}: AdminFlowGuideProps) {
  return (
    <section className="app-flow-guide">
      {breadcrumbs.length > 0 && (
        <div className="app-flow-guide__breadcrumbs">
          {breadcrumbs.map((breadcrumb, index) => (
            <div key={`${breadcrumb.label}-${index}`} className="app-flow-guide__breadcrumb-wrap">
              <span
                className={`app-flow-guide__breadcrumb ${breadcrumb.current ? 'app-flow-guide__breadcrumb--current' : ''}`}
              >
                {breadcrumb.label}
              </span>
              {index < breadcrumbs.length - 1 && <ArrowRight className="app-flow-guide__separator" />}
            </div>
          ))}
        </div>
      )}

      <div className="app-flow-guide__top">
        <div className="app-flow-guide__copy">
          <p className="app-flow-guide__eyebrow">{eyebrow}</p>
          <h2 className="app-flow-guide__title">{title}</h2>
          <p className="app-flow-guide__description">{description}</p>
        </div>

        {(asideTitle || asideDescription || actions) && (
          <aside className="app-flow-guide__aside">
            {asideTitle && <p className="app-flow-guide__aside-label">{asideTitle}</p>}
            {asideDescription && <p className="app-flow-guide__aside-text">{asideDescription}</p>}
            {actions && <div className="app-flow-guide__actions">{actions}</div>}
          </aside>
        )}
      </div>

      {steps.length > 0 && (
        <div className="app-flow-guide__steps">
          {steps.map((step, index) => {
            const StatusIcon = STATUS_ICON[step.status];

            return (
              <div
                key={`${step.label}-${index}`}
                className={`app-flow-guide__step app-flow-guide__step--${step.status}`}
              >
                <div className="app-flow-guide__step-head">
                  <span className={`app-flow-guide__step-icon app-flow-guide__step-icon--${step.status}`}>
                    <StatusIcon className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="app-flow-guide__step-label">{step.label}</p>
                    <p className="app-flow-guide__step-helper">{step.helper}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {contextItems.length > 0 && (
        <div className="app-flow-guide__context">
          {contextItems.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className={`app-flow-guide__context-chip app-flow-guide__context-chip--${item.tone || 'slate'}`}
            >
              <span className="app-flow-guide__context-label">{item.label}</span>
              <span className="app-flow-guide__context-value">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}