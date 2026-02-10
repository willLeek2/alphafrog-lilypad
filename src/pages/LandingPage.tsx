import { Link } from 'react-router-dom';
import ActionButton from "../components/ActionButton";
import FeatureCard from "../components/FeatureCard";
import SectionHeading from "../components/SectionHeading";
import {
  agentWorkflow,
  coreModules,
  metrics,
  stackHighlights,
  visionPoints,
} from "../data/landing";

const LandingPage = () => (
  <div className="space-y-20 pb-24">
    <section className="px-6 pt-12 md:pt-20">
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-sky-100 px-4 py-1 text-xs font-semibold text-sky-700">
            v0.3 Vision Preview
          </span>
          <h1 className="text-balance text-4xl font-semibold text-ink-900 md:text-5xl lg:text-6xl">
            An intelligent A-share data platform for analysts, investors, and builders.
          </h1>
          <p className="text-balance text-lg text-ink-700 md:text-xl">
            AlphaFrog combines microservice-grade data infrastructure with an AI agent
            layer, so you can move from raw market data to portfolio insight in minutes.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/agent/chat">
              <ActionButton>Enter Workspace</ActionButton>
            </Link>
            <ActionButton variant="outline" onClick={() => alert('Demo 功能即将上线')}>
              Request Demo
            </ActionButton>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-ink-700">
            {metrics.map((metric) => (
              <div key={metric.label} className="space-y-1">
                <p className="text-2xl font-semibold text-ink-900">{metric.value}</p>
                <p className="uppercase tracking-[0.2em]">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="absolute -top-10 right-0 h-40 w-40 rounded-full bg-sky-200 opacity-60 blur-3xl" />
          <div className="absolute -bottom-8 left-8 h-32 w-32 rounded-full bg-sky-100 opacity-70 blur-2xl" />
          <div className="relative space-y-6 rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-glow backdrop-blur">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">
                Live snapshot
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ink-900">
                Market intelligence, orchestrated.
              </h2>
            </div>
            <div className="space-y-4">
              {agentWorkflow.map((item, index) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm text-ink-700 shadow-card animate-fadeUp"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <p className="text-base font-semibold text-ink-900">{item.step}</p>
                  <p className="mt-1 text-sm text-ink-700">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="vision" className="px-6">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <SectionHeading
          eyebrow="v0.3 Vision"
          title="AI agents built for real portfolio workflows."
          description="The next release blends natural language interfaces with tool orchestration and retrieval, so the system can answer both instant questions and deep analytical prompts."
        />
        <div className="grid gap-6 md:grid-cols-2">
          {visionPoints.map((point, index) => (
            <div
              key={point.title}
              className="rounded-2xl border border-sky-100 bg-white/80 p-6 shadow-card animate-fadeUp"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <h3 className="text-xl font-semibold text-ink-900">{point.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section id="modules" className="px-6">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <SectionHeading
          eyebrow="Core Services"
          title="A modular platform for A-share market intelligence."
          description="Each microservice handles a single domain, keeping data, workflows, and scaling clean."
        />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {coreModules.map((module) => (
            <FeatureCard
              key={module.title}
              title={module.title}
              description={module.description}
              tag={module.tag}
            />
          ))}
        </div>
      </div>
    </section>

    <section id="stack" className="px-6">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <SectionHeading
          eyebrow="Technical Stack"
          title="Built for extensibility, observability, and agent tooling."
          description="A proven infrastructure stack with agent-ready extensions for LLM orchestration and RAG."
        />
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-card">
            <p className="text-sm font-semibold text-ink-700">Stack highlights</p>
            <ul className="mt-4 space-y-3 text-base text-ink-900">
              {stackHighlights.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-sky-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-sky-100 bg-sky-50/80 p-6 shadow-card">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">
              Agent Flow
            </p>
            <div className="mt-4 space-y-4 text-sm text-ink-700">
              {agentWorkflow.map((item) => (
                <div key={item.step} className="flex items-start gap-4">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-700">
                    {item.step}
                  </span>
                  <p className="text-sm">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-3xl border border-sky-100 bg-gradient-to-r from-sky-600 via-sky-500 to-sky-700 p-10 text-white shadow-glow">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-100">
                Ready to explore
              </p>
              <h2 className="text-3xl font-semibold">Bring your portfolio data to life.</h2>
              <p className="text-sm text-sky-100">
                Activate the AlphaFrog workspace and test the agent-powered analysis flow.
              </p>
            </div>
            <Link to="/agent/chat">
              <ActionButton
                className="bg-white text-sky-700 hover:bg-sky-50"
              >
                Launch AlphaFrog
              </ActionButton>
            </Link>
          </div>
        </div>
      </div>
    </section>
  </div>
);

export default LandingPage;
