"use client";

import { ArrowRight, Check, LockKeyhole, Radar, ScanSearch, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Grid } from "@/components/canvasui/Grid/Grid";

const MONITOR_ROWS = [
  { index: "01", title: "Official lab releases", meta: "Models / products / research" },
  { index: "02", title: "Safety and policy moves", meta: "Governance / evaluations" },
  { index: "03", title: "Signal, not social noise", meta: "Primary sources / verified" },
];

const SOURCES = [
  { name: "OpenAI", logo: "/assets/openai-logo.webp" },
  { name: "Anthropic", logo: "/assets/anthropic-logo.png" },
  { name: "Google DeepMind", logo: "/assets/deepmind-logo.webp" },
];

export function LandingPage() {
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errorCode = query.get("error_code") || fragment.get("error_code");
    if (!errorCode) return;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const loginUrl = new URL("/login", siteUrl);
    loginUrl.searchParams.set("error", errorCode === "otp_expired" ? "reset_link_invalid" : "confirmation_failed");
    window.location.replace(loginUrl.toString());
  }, []);

  return (
    <main className="public-landing">
      <header className="landing-nav">
        <Link className="landing-brand" href="/" aria-label="AI War home">
          <img src="/assets/aiwar-logo-mark.png" alt="AI War" />
        </Link>
        <nav className="landing-links" aria-label="Main navigation">
          <a href="#why-aiwar">Why AI War</a>
          <a href="#sources">Sources</a>
        </nav>
        <Link className="landing-signin" href="/login">
          Sign in <ArrowRight size={14} />
        </Link>
      </header>

      <Grid
        className="landing-hero"
        tileSize={118}
        gap={2}
        cornerRadius={4}
        amplitude={2.2}
        waveSpeed={0.46}
        frequency={13}
        waveWidth={0.07}
        fadeTime={0.5}
        liftHeight={38}
        perspective={1300}
        tilt={0.45}
        shading={0.28}
        tint={[1, 0.4, 0.1]}
        tintStrength={0.38}
        idleRipples={4.5}
      >
        <div className="hero-content">
          <div className="hero-copy">
            <span className="hero-kicker"><i /> Frontier AI intelligence</span>
            <h1>
              Track the labs.<br />
              <em>Read the signal.</em>
            </h1>
            <p>
              A private intelligence feed for the research, models, products, and policy moves shaping the AI race.
            </p>
            <div className="hero-actions">
              <Link className="hero-cta" href="/login">
                Access AI War <ArrowRight size={16} />
              </Link>
              <a className="hero-secondary" href="#why-aiwar">See how it works</a>
            </div>
          </div>

          <div className="hero-terminal" aria-label="AI War monitoring coverage">
            <div className="terminal-head">
              <span>Signal monitor</span>
              <span className="terminal-status"><i /> Always on</span>
            </div>
            <div className="terminal-list">
              {MONITOR_ROWS.map((row) => (
                <div key={row.index} className="terminal-item terminal-static">
                  <span className="terminal-index">{row.index}</span>
                  <span className="terminal-story">
                    <strong>{row.title}</strong>
                    <span>{row.meta}</span>
                  </span>
                  <Check size={14} />
                </div>
              ))}
            </div>
            <div className="terminal-foot">
              <span>Continuous monitoring</span>
              <span>Member access</span>
            </div>
          </div>
        </div>
      </Grid>

      <section className="source-ribbon" id="sources" aria-label="Sources monitored by AI War">
        <span>Monitoring the frontier</span>
        <div>
          {SOURCES.map((source) => (
            <span key={source.name} className="landing-source">
              <img src={source.logo} alt="" /> {source.name}
            </span>
          ))}
        </div>
      </section>

      <section className="landing-value" id="why-aiwar">
        <div className="value-intro">
          <span className="landing-eyebrow">The intelligence layer</span>
          <h2>The AI race moves daily.<br />Your context should too.</h2>
          <p>AI War turns scattered lab updates into one calm, searchable reading surface built for people who need to stay ahead.</p>
        </div>
        <div className="value-grid">
          <article><Radar /><span>01</span><h3>One live radar</h3><p>Watch the major frontier labs without opening a dozen blogs and research pages.</p></article>
          <article><ScanSearch /><span>02</span><h3>Fast signal finding</h3><p>Filter by source, category, and time range to get directly to what changed.</p></article>
          <article><Zap /><span>03</span><h3>Built for speed</h3><p>Scan headlines, open the primary source, and move from update to understanding quickly.</p></article>
        </div>
      </section>

      <section className="landing-access">
        <div>
          <LockKeyhole size={20} />
          <span className="landing-eyebrow">Private member feed</span>
          <h2>Your intelligence feed starts after sign in.</h2>
        </div>
        <Link className="hero-cta" href="/login">Sign in to continue <ArrowRight size={16} /></Link>
      </section>

      <footer className="landing-footer">
        <img src="/assets/aiwar-logo-mark.png" alt="AI War" />
        <span>Frontier AI intelligence, without the noise.</span>
      </footer>
    </main>
  );
}
