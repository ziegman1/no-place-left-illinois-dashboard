import React from 'react';

function AboutPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        backgroundColor: '#fff',
        paddingTop: '2rem',
        paddingBottom: '6rem',
        width: '100%',
      }}
    >
      <div
        style={{
          maxWidth: '900px',
          width: '100%',
          padding: '0 4rem',
          lineHeight: '1.6',
          color: '#333',
          boxSizing: 'border-box',
          margin: '0 auto',
        }}
      >
      <h1 style={{ 
        textAlign: 'center', 
        fontSize: '2.5rem', 
        fontWeight: 'bold', 
        marginBottom: '2rem',
        color: '#222'
      }}>
        #NoPlaceLeft Illinois
      </h1>
      
      <div style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>
        <p>
          #NoPlaceLeft is part of a global movement of ordinary people making and multiplying disciples until there is no place left where the gospel hasn't been shared. Our vision is rooted in Romans 15:23, where the Apostle Paul declared there was "no place left" for him to work because the gospel had gone forth fully in the regions he served. We believe the same is possible today—starting right here in Illinois.
        </p>
      </div>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ 
          fontSize: '1.8rem', 
          fontWeight: 'bold', 
          marginBottom: '1rem',
          color: '#222'
        }}>
          Our Vision
        </h2>
        <p style={{ marginBottom: '1rem' }}>
          We long to see a day when there is no place left in Illinois where the gospel has not been heard, where every person has had a clear opportunity to respond to Jesus, and every follower of Christ is equipped and active in making disciples.
        </p>
        <p>
          This isn't a vision for a few. It's a vision for the whole church—pastors, leaders, families, students, retirees—united by a burden to see the Good News reach every neighborhood, every community, and every person in our state.
        </p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ 
          fontSize: '1.8rem', 
          fontWeight: 'bold', 
          marginBottom: '1rem',
          color: '#222'
        }}>
          Our Strategy
        </h2>
        <p style={{ marginBottom: '1rem' }}>
          To bring this vision to life, we are building a grassroots network of disciple-makers across the state. The strategy is simple but powerful:
        </p>
        <ul style={{ 
          listStyleType: 'none', 
          paddingLeft: 0,
          marginBottom: '1rem'
        }}>
          <li style={{ 
            marginBottom: '1rem', 
            paddingLeft: '1.5rem', 
            position: 'relative'
          }}>
            <span style={{ 
              position: 'absolute', 
              left: 0, 
              color: '#222', 
              fontWeight: 'bold'
            }}>•</span>
            <strong>Identify and equip a County Coordinator</strong> for each of Illinois' 102 counties. These leaders will serve as catalysts—praying over, training, and coaching believers in their area.
          </li>
          <li style={{ 
            marginBottom: '1rem', 
            paddingLeft: '1.5rem', 
            position: 'relative'
          }}>
            <span style={{ 
              position: 'absolute', 
              left: 0, 
              color: '#222', 
              fontWeight: 'bold'
            }}>•</span>
            <strong>Each County Coordinator will identify and support Census Tract Coordinators</strong> within their county. These leaders will take spiritual responsibility for the neighborhoods and communities within their assigned tract, engaging in intentional disciple-making and simple church planting efforts.
          </li>
          <li style={{ 
            marginBottom: '1rem', 
            paddingLeft: '1.5rem', 
            position: 'relative'
          }}>
            <span style={{ 
              position: 'absolute', 
              left: 0, 
              color: '#222', 
              fontWeight: 'bold'
            }}>•</span>
            <strong>Through ongoing training, encouragement, and collaboration</strong>, we aim to saturate each tract with multiplying disciples and simple churches until every person in Illinois has access to the gospel through someone they know and trust.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ 
          fontSize: '1.8rem', 
          fontWeight: 'bold', 
          marginBottom: '1rem',
          color: '#222'
        }}>
          Join the Movement
        </h2>
        <p style={{ marginBottom: '1rem' }}>
          We're not waiting for the perfect plan or perfect people. We're stepping forward in faith and obedience, one conversation at a time. Whether you're a seasoned church leader or a new believer, there's a role for you in seeing #NoPlaceLeft in your neighborhood and beyond.
        </p>
        <p style={{ 
          fontSize: '1.2rem', 
          fontWeight: 'bold', 
          textAlign: 'center',
          color: '#222',
          fontStyle: 'italic'
        }}>
          Let's labor together—until there's no place left in Illinois.
        </p>
      </section>
      </div>
    </div>
  );
}

export default AboutPage; 