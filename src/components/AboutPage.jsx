import React from 'react';
import './AboutPage.css';

function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-content">
        <h1 className="about-title">
          #NoPlaceLeft Illinois
        </h1>
        
        <div className="about-intro">
          <p>
            #NoPlaceLeft is part of a global movement of ordinary people making and multiplying disciples until there is no place left where the gospel hasn't been shared. Our vision is rooted in Romans 15:23, where the Apostle Paul declared there was "no place left" for him to work because the gospel had gone forth fully in the regions he served. We believe the same is possible today—starting right here in Illinois.
          </p>
        </div>

        <section className="about-section">
          <h2>Our Vision</h2>
          <p>
            We long to see a day when there is no place left in Illinois where the gospel has not been heard, where every person has had a clear opportunity to respond to Jesus, and every follower of Christ is equipped and active in making disciples.
          </p>
          <p>
            This isn't a vision for a few. It's a vision for the whole church—pastors, leaders, families, students, retirees—united by a burden to see the Good News reach every neighborhood, every community, and every person in our state.
          </p>
        </section>

        <section className="about-section">
          <h2>Our Strategy</h2>
          <p>
            To bring this vision to life, we are building a grassroots network of disciple-makers across the state. The strategy is simple but powerful:
          </p>
          <ul className="about-list">
            <li>
              <span>•</span>
              <strong>Identify and equip a County Coordinator</strong> for each of Illinois' 102 counties. These leaders will serve as catalysts—praying over, training, and coaching believers in their area.
            </li>
            <li>
              <span>•</span>
              <strong>Each County Coordinator will identify and support Census Tract Coordinators</strong> within their county. These leaders will take spiritual responsibility for the neighborhoods and communities within their assigned tract, engaging in intentional disciple-making and simple church planting efforts.
            </li>
            <li>
              <span>•</span>
              <strong>Through ongoing training, encouragement, and collaboration</strong>, we aim to saturate each tract with multiplying disciples and simple churches until every person in Illinois has access to the gospel through someone they know and trust.
            </li>
          </ul>
        </section>

        <section className="about-section">
          <h2>Join the Movement</h2>
          <p>
            We're not waiting for the perfect plan or perfect people. We're stepping forward in faith and obedience, one conversation at a time. Whether you're a seasoned church leader or a new believer, there's a role for you in seeing #NoPlaceLeft in your neighborhood and beyond.
          </p>
          <p className="about-cta">
            Let's labor together—until there's no place left in Illinois.
          </p>
        </section>
      </div>
    </div>
  );
}

export default AboutPage; 