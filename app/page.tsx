'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronRight, CirclePlay, Fingerprint, GitBranch, Menu, ScanEye, ShieldCheck, Sparkles, X } from 'lucide-react';

const consoleHref = process.env.NEXT_PUBLIC_SUPABASE_URL ? "/dashboard" : "/console";

function Logo() { return <span className="brand"><span className="brand-mark"><span /></span>aron<span className="brand-dot">.</span></span>; }

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) { return <div className={`reveal ${className}`}>{children}</div>; }

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scroll, setScroll] = useState(0);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), { threshold: .12 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    const onScroll = () => setScroll(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, []);
  return <main id="top">
    <div className="ambient ambient-one" style={{ transform: `translate3d(0,${Math.min(scroll * .16, 250)}px,0)` }} />
    <div className="ambient ambient-two" />
    <header className="site-header"><div className="site-header-inner">
      <Link href="/" aria-label="Aron home"><Logo /></Link>
      <nav className={menuOpen ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">
        <a href="#platform" onClick={() => setMenuOpen(false)}>Platform</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#security" onClick={() => setMenuOpen(false)}>Trust</a><a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
      </nav>
      <div className="nav-actions"><Link className="nav-login" href={consoleHref}>Open console <ArrowUpRight size={15}/></Link><Link className="button button-cyan nav-cta" href={consoleHref}>Launch demo <ArrowRight size={16}/></Link></div>
      <button className="menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button>
    </div></header>

    <section className="hero section-shell">
      <div className="hero-grid"><div className="hero-copy">
        <div className="eyebrow"><span className="live-pulse" /> THE CONTROL PLANE FOR AI AGENTS <span className="eyebrow-line" /></div>
        <h1>Give every agent<br/><em>a clear line</em><br/>of control<span className="cyan-period">.</span></h1>
        <p className="hero-lead">See every decision. Set the rules before tools run. Keep a human in the loop when it matters.</p>
        <div className="hero-actions"><Link className="button button-cyan button-large" href={consoleHref}>Explore the live demo <ArrowUpRight size={19}/></Link><a className="text-link" href="#how-it-works"><CirclePlay size={19}/> See how Aron works</a></div>
        <div className="hero-note"><span className="tiny-grid"/> Fictional data. Real policy logic. Zero live refunds.</div>
      </div>
      <div className="hero-visual" aria-label="Illustration of an agent run passing through policy review">
        <div className="visual-glow"/>
        <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
        <div className="floating-label floating-label-top"><span className="mini-dot cyan"/> LIVE TRACE <span>00:01.24</span></div>
        <div className="product-window">
          <div className="window-top"><div className="window-controls"><i/><i/><i/></div><span>run_04f7a2 / customer.refund</span><span className="window-live"><i/> LIVE</span></div>
          <div className="window-body"><div className="window-sidebar"><span className="side-logo">a<span>.</span></span><span className="side-active"/><span/><span/><span/></div>
            <div className="window-main"><div className="window-heading"><div><span className="micro-label">RUN TIMELINE</span><h3>One run. Every answer.</h3></div><span className="window-pill">In progress</span></div>
              <div className="trace-line"><div className="trace-node violet"><Sparkles size={14}/></div><div><strong>Agent started</strong><small>support.refund · 09:41:08</small></div><span>0 ms</span></div>
              <div className="trace-line"><div className="trace-node purple"><ScanEye size={14}/></div><div><strong>Order lookup</strong><small>tool.call · order_7821</small></div><span>384 ms</span></div>
              <div className="trace-line active-trace"><div className="trace-node cyan"><ShieldCheck size={14}/></div><div><strong>Policy evaluated</strong><small>Amount $240.00 · needs review</small></div><span className="trace-review">REVIEW</span></div>
              <div className="trace-line muted-trace"><div className="trace-node"><Fingerprint size={14}/></div><div><strong>Human approval</strong><small>Waiting for a decision</small></div><span>—</span></div>
            </div>
          </div>
        </div>
        <div className="floating-card"><div className="floating-icon"><ShieldCheck size={18}/></div><div><b>Action paused safely</b><span>Nothing executes before approval.</span></div><Check size={16} className="floating-check"/></div>
        <div className="visual-caption">FIG. 01 <span>VISIBILITY MEETS CONTROL</span></div>
      </div></div>
      <a className="scroll-cue" href="#platform"><span>SCROLL TO EXPLORE</span><ArrowDown size={16}/></a>
    </section>

    <div className="signal-strip"><div className="signal-track">TRACE EVERY RUN <span>✳</span> GATE EVERY ACTION <span>✳</span> KEEP HUMANS IN CONTROL <span>✳</span> TRACE EVERY RUN <span>✳</span> GATE EVERY ACTION <span>✳</span> KEEP HUMANS IN CONTROL <span>✳</span></div></div>

    <section className="intro-section section-shell" id="platform"><Reveal className="section-kicker">01 / THE PROBLEM</Reveal><div className="intro-grid"><Reveal><h2>Agents move fast.<br/><span>Understanding them<br/>shouldn’t lag behind.</span></h2></Reveal><Reveal><p>When an agent touches real workflows, a transcript isn’t enough. You need to know what it tried, which rule applied, what it cost, and who gave the go-ahead.</p><p>Aron puts that story in one place — then steps in before a risky tool call becomes a costly mistake.</p><Link className="inline-link" href={consoleHref}>See the control plane <ArrowUpRight size={18}/></Link></Reveal></div></section>

    <section className="feature-section section-shell"><div className="section-heading"><Reveal><span className="section-kicker">02 / THE PLATFORM</span><h2>Clarity at every<br/><em>critical moment.</em></h2></Reveal><Reveal><p>Three connected layers give your team the context to move quickly and the confidence to pause when needed.</p></Reveal></div>
      <div className="feature-grid">
        <Reveal className="feature-card feature-trace"><div className="feature-top"><span className="feature-index">01 / OBSERVE</span><ScanEye size={23}/></div><div className="feature-art trace-art"><div className="art-time">09:41:08 <span>RUN STARTED</span></div><div className="art-path"><span/><span/><span/><span/></div><div className="art-rows"><div><i/> Agent started <b>0 ms</b></div><div><i/> Intent classified <b>214 ms</b></div><div><i/> Order lookup <b>384 ms</b></div><div><i/> Policy evaluated <b>642 ms</b></div></div></div><div className="feature-body"><h3>See the whole story.</h3><p>Follow model calls, tools, policy decisions, timing, and estimated cost in one ordered trace.</p></div></Reveal>
        <Reveal className="feature-card feature-gate"><div className="feature-top"><span className="feature-index">02 / ENFORCE</span><ShieldCheck size={23}/></div><div className="feature-art gate-art"><div className="gate-amount">$240<span>.00</span></div><div className="gate-route"><span>PROPOSED ACTION</span><span>POLICY CHECK</span><span className="gate-stop">PAUSED FOR REVIEW</span></div><div className="gate-lock"><ShieldCheck size={18}/> Tool execution held</div></div><div className="feature-body"><h3>Set rules that actually stop actions.</h3><p>Deterministic checks run before consequential tools. An approval is a gate, not an afterthought.</p></div></Reveal>
        <Reveal className="feature-card feature-human"><div className="feature-top"><span className="feature-index">03 / DECIDE</span><Fingerprint size={23}/></div><div className="feature-art human-art"><div className="review-mini"><span>APPROVAL REQUEST</span><b>Refund $240.00</b><small>Requires a human decision</small><div className="review-buttons"><span>Reject</span><span>Approve <ArrowRight size={13}/></span></div></div><div className="audit-mini">✓ Decision recorded <span>09:44:32</span></div></div><div className="feature-body"><h3>Keep people accountable.</h3><p>Give reviewers the trace, require a reason, and keep the decision in an auditable record.</p></div></Reveal>
      </div>
    </section>

    <section className="story-section" id="how-it-works"><div className="section-shell story-inner"><Reveal className="story-intro"><span className="section-kicker">03 / A SIMPLE PROOF</span><h2>One policy.<br/>Three distinct outcomes.</h2><p>The fictional refund demo shows the exact moment Aron changes what an agent can do.</p></Reveal><div className="story-cases"><Reveal className="story-case"><div className="case-number">01</div><div className="case-content"><span className="case-label">SAFE PATH</span><h3>$24.99 refund</h3><p>The amount is under the $50 limit. Aron records the decision, then allows the fictional refund simulator to run.</p><div className="case-status allowed"><Check size={17}/> ALLOWED → SIMULATED</div></div></Reveal><Reveal className="story-case"><div className="case-number">02</div><div className="case-content"><span className="case-label">HUMAN PATH</span><h3>$240 refund</h3><p>The amount crosses the threshold. Aron holds the action, opens an approval, and waits for a person to decide.</p><div className="case-status pending"><ShieldCheck size={17}/> PAUSED → REVIEW REQUIRED</div></div></Reveal><Reveal className="story-case"><div className="case-number">03</div><div className="case-content"><span className="case-label">HARD STOP</span><h3>Over $500</h3><p>The amount exceeds the maximum. Policy blocks execution completely and preserves the reason in the trace.</p><div className="case-status blocked"><X size={17}/> BLOCKED → NO TOOL CALL</div></div></Reveal></div></div></section>

    <section className="security-section section-shell" id="security"><div className="security-visual"><div className="security-orbit one"/><div className="security-orbit two"/><div className="security-core"><ShieldCheck size={42}/></div><span className="security-pill pill-one">DETERMINISTIC POLICY</span><span className="security-pill pill-two">DECISION AUDIT</span><span className="security-pill pill-three">HUMAN REVIEW</span></div><Reveal className="security-copy"><span className="section-kicker">04 / BUILT FOR TRUST</span><h2>Control belongs<br/>outside the model.</h2><p>Language models can suggest actions. Aron’s deterministic policy decides whether protected tools can run. The demo uses fictional data and never contacts a payment provider.</p><ul><li><Check size={17}/> Policy before execution</li><li><Check size={17}/> A reason for every intervention</li><li><Check size={17}/> Safe, inspectable demo actions</li></ul><Link href={consoleHref} className="inline-link">Inspect the live flow <ArrowUpRight size={18}/></Link></Reveal></section>

    <section className="pricing-section section-shell" id="pricing"><Reveal className="pricing-heading"><span className="section-kicker">05 / SIMPLE STARTING POINTS</span><h2>Start tracing.<br/><em>Scale with confidence.</em></h2><p>Pricing below is a hypothesis for user testing, not an active billing offer.</p></Reveal><div className="pricing-grid"><Reveal className="price-card"><span>DEVELOPER</span><h3>Free</h3><p>Explore the core workflow.</p><div className="price-rule"/><ul><li><Check size={16}/> 1,000 traced runs / month</li><li><Check size={16}/> 7-day retention</li><li><Check size={16}/> One workspace</li></ul><Link href={consoleHref} className="price-link">Try the demo <ArrowUpRight size={17}/></Link></Reveal><Reveal className="price-card featured"><div className="popular">FOR GROWING TEAMS</div><span>TEAM</span><h3>$29<span> / month</span></h3><p>Shared visibility and review.</p><div className="price-rule"/><ul><li><Check size={16}/> 25,000 traced runs / month</li><li><Check size={16}/> 30-day retention</li><li><Check size={16}/> Shared policies and approvals</li></ul><Link href={consoleHref} className="price-link">Explore the console <ArrowUpRight size={17}/></Link></Reveal><Reveal className="price-card"><span>SCALE</span><h3>Custom</h3><p>For high-volume operations.</p><div className="price-rule"/><ul><li><Check size={16}/> Custom run volume</li><li><Check size={16}/> Longer retention</li><li><Check size={16}/> Planned SSO and export</li></ul><Link href={consoleHref} className="price-link">View product demo <ArrowUpRight size={17}/></Link></Reveal></div></section>

    <section className="final-cta"><div className="section-shell final-inner"><Reveal><span className="section-kicker">TAKE A CLOSER LOOK</span><h2>Let agents act.<br/><em>Know when to pause.</em></h2><p>Try the fictional refund workflow and see the policy gate, trace, and review in motion.</p><Link className="button button-cyan button-large" href={consoleHref}>Launch interactive demo <ArrowUpRight size={19}/></Link></Reveal><div className="cta-symbol" aria-hidden="true"><span/><span/><span/></div></div></section>
    <footer><div className="section-shell footer-inner"><Logo/><span>© {new Date().getFullYear()} Aron. Built for considered autonomy.</span><a href="#top">Back to top ↑</a></div></footer>
  </main>;
}
