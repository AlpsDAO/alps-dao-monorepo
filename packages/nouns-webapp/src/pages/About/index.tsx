import React from 'react';
import { Link } from 'react-router-dom';
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

const AboutPage = () => (
  <div className={classes.page}>
    <img className={classes.banner} src={banner} alt="Alps characters riding a gondola above the mountains" />
    <h1 className={classes.title}>About Alps</h1>
    <p className={classes.intro}>{aboutIntro}</p>

    <nav className={classes.toc} aria-label="About sections">
      {aboutSections.map(section => (
        <a key={section.id} href={`#${section.id}`} className={classes.tocLink}>
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

export default AboutPage;
