import React from 'react';
import './member-v2-blank.css';

export default function MemberV2Blank({ userName = 'Member' }: { userName?: string }) {
  return (
    <main className="v2blank">
      <header className="v2blank-header">
        <div>
          <p className="v2blank-kicker">HOUSEEATS</p>
          <h1>Good evening, {userName}.</h1>
        </div>
        <button className="v2blank-avatar" aria-label="Open profile">{userName.slice(0,1).toUpperCase()}</button>
      </header>

      <section className="v2blank-today">
        <p className="v2blank-label">TONIGHT</p>
        <h2>What’s for dinner?</h2>
        <div className="v2blank-rule" />
        <p className="v2blank-empty">Your kitchen’s menu will appear here.</p>
        <button className="v2blank-primary">View menu</button>
      </section>

      <section className="v2blank-actions">
        <button><span>01</span><strong>Late plate</strong><em>Request one →</em></button>
        <button><span>02</span><strong>Allergies</strong><em>Dietary profile →</em></button>
        <button><span>03</span><strong>Alerts</strong><em>View updates →</em></button>
      </section>

      <nav className="v2blank-nav" aria-label="Member navigation">
        <button className="active">Home</button><button>Menu</button><button>Late plate</button><button>Alerts</button><button>Profile</button>
      </nav>
    </main>
  );
}
