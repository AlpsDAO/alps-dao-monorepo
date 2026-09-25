import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import classes from './About.module.css';
import banner from '../../assets/about/gondola-banner.jpg';
import { aboutIntro, aboutSections } from './content';

// Internal links ("/vote") navigate in-app so the wallet stays connected; everything else opens a new tab
const MarkdownLink: React.FC<{ href?: string }> = ({ href = '', children }) =>
  href.startsWith('/') ? (
    <Link to={href}>{children}</Link>
  ) : (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );

const AboutPage = () => {
  // In-app links like /about#governance don't scroll by themselves
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  // Highlight the section being read in the sticky section bar, and keep its chip in view
  const [activeId, setActiveId] = useState(aboutSections[0].id);
  const tocRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length) setActiveId(visible[0].target.id);
      },
      // A section counts as current while it crosses a band just below the section bar
      { rootMargin: '-20% 0px -70% 0px' },
    );
    aboutSections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const toc = tocRef.current;
    const chip = toc?.querySelector<HTMLElement>(`a[href="#${activeId}"]`);
    if (toc && chip) {
      toc.scrollTo({ left: chip.offsetLeft - (toc.clientWidth - chip.clientWidth) / 2, behavior: 'smooth' });
    }
  }, [activeId]);

  return (
    <div className={classes.page}>
      <img
        className={classes.banner}
        src={banner}
        alt="Alps characters riding a gondola above the mountains"
      />
      <h1 className={classes.title}>About Alps</h1>
      <p className={classes.intro}>{aboutIntro}</p>

      <nav ref={tocRef} className={classes.toc} aria-label="About sections">
        {aboutSections.map(section => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={section.id === activeId ? `${classes.tocLink} ${classes.active}` : classes.tocLink}
            aria-current={section.id === activeId ? 'true' : undefined}
          >
            {section.title}
          </a>
        ))}
      </nav>

      {aboutSections.map(section => (
        <section key={section.id} id={section.id} className={classes.section}>
          <h2>{section.title}</h2>
          <ReactMarkdown
            className={classes.markdown}
            children={section.markdown}
            remarkPlugins={[remarkBreaks]}
            components={{ a: MarkdownLink }}
          />
        </section>
      ))}
    </div>
  );
};

export default AboutPage;
