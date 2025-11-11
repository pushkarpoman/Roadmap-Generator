import { useState } from 'react';
import PropTypes from 'prop-types';


function RoadmapVisualization({ roadmap }) {
  const [openStage, setOpenStage] = useState(null);

  if (!roadmap || !roadmap.stages) {
    return null;
  }

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '3rem auto', padding: '2rem', position: 'relative' }}>
      <h2 style={{
        textAlign: 'center',
        fontSize: '2.5rem',
        fontWeight: '700',
        marginBottom: '1rem',
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        {roadmap.title}
      </h2>

      {/* Central Timeline */}
      <div style={{ position: 'relative', padding: '2rem 0' }}>
        {/* Vertical Timeline Line */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '0',
          bottom: '0',
          width: '3px',
          background: 'linear-gradient(180deg, #3b82f6 0%, #8b5cf6 100%)',
          transform: 'translateX(-50%)',
          zIndex: '0'
        }} />

        {/* Stages */}
        {roadmap.stages.map((stage, index) => {
          const isLeft = index % 2 === 0;
          const isOpen = openStage === index;

          return (
            <div
              key={stage.id}
              style={{
                display: 'flex',
                justifyContent: isLeft ? 'flex-start' : 'flex-end',
                alignItems: 'center',
                marginBottom: index < roadmap.stages.length - 1 ? '3rem' : '0',
                position: 'relative'
              }}
            >
              {/* Stage Card Container */}
              <div style={{
                width: '45%',
                position: 'relative'
              }}>
                {/* Connecting Line to Timeline */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  [isLeft ? 'right' : 'left']: '-50px',
                  width: '40px',
                  height: '2px',
                  background: isOpen ? '#3b82f6' : '#475569',
                  transition: 'all 0.3s ease',
                  zIndex: '1'
                }} />

                {/* Stage Card */}
                <div
                  onClick={() => setOpenStage(index)}
                  style={{
                    position: 'relative',
                    background: isOpen 
                      ? 'linear-gradient(135deg, #1e293b 0%, #1e1b4b 100%)'
                      : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    border: `2px solid ${isOpen ? '#8b5cf6' : '#334155'}`,
                    borderRadius: '20px',
                    padding: '2rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: isOpen 
                      ? '0 10px 30px rgba(139, 92, 246, 0.4)' 
                      : '0 4px 6px rgba(0, 0, 0, 0.1)',
                    transform: isOpen ? 'translateY(-5px)' : 'translateY(0)'
                  }}
                >
                  {/* Stage Number Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '-15px',
                    left: '20px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    color: 'white',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '1.2rem',
                    boxShadow: '0 4px 8px rgba(59, 130, 246, 0.4)'
                  }}>
                    {index + 1}
                  </div>

                  {/* Stage Content */}
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    color: '#f1f5f9',
                    marginBottom: '0.5rem'
                  }}>
                    {stage.name}
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#94a3b8',
                    fontWeight: '500'
                  }}>
                    {stage.duration}
                  </div>
                </div>
              </div>

              {/* Center Timeline Node */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: isOpen ? '#8b5cf6' : '#64748b',
                border: '3px solid #0f172a',
                transition: 'all 0.3s ease',
                zIndex: '2',
                boxShadow: isOpen ? '0 0 20px rgba(139, 92, 246, 0.8)' : 'none'
              }} />
            </div>
          );
        })}

        {/* Success End Node */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '3rem',
          position: 'relative',
          zIndex: '2'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            padding: '1.5rem 3rem',
            borderRadius: '50px',
            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4)'
          }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'white',
              textAlign: 'center'
            }}>
              🎯 Goal Achieved!
            </div>
          </div>
        </div>
      </div>

      {/* Centered Click Modal */}
      {openStage !== null && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
          onClick={() => setOpenStage(null)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
              border: '2px solid #8b5cf6',
              borderRadius: '20px',
              padding: '2.5rem',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px rgba(139, 92, 246, 0.5)',
              animation: 'modalSlideIn 0.3s ease',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setOpenStage(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                color: '#cbd5e1',
                fontSize: '2rem',
                cursor: 'pointer',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(203, 213, 225, 0.2)';
                e.target.style.color = '#8b5cf6';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#cbd5e1';
              }}
            >
              &times;
            </button>

            <h3 style={{
              color: '#f1f5f9',
              fontSize: '1.8rem',
              marginBottom: '1.5rem',
              fontWeight: '700',
              textAlign: 'center'
            }}>
              {roadmap.stages[openStage].name}
            </h3>

            <p style={{
              color: '#cbd5e1',
              lineHeight: '1.7',
              marginBottom: '2rem',
              fontSize: '1rem',
              textAlign: 'center'
            }}>
              {roadmap.stages[openStage].description}
            </p>

            {/* Skills Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{
                color: '#3b82f6',
                fontSize: '1.3rem',
                marginBottom: '1rem',
                fontWeight: '600',
                textAlign: 'center'
              }}>
                Key Skills
              </h4>
              <ul style={{
                listStyle: 'none',
                padding: '0',
                margin: '0',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.5rem'
              }}>
                {(roadmap.stages[openStage].skills || []).map((skill, idx) => (
                  <li key={idx} style={{
                    color: '#cbd5e1',
                    padding: '0.75rem 1rem',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    lineHeight: '1.4',
                    fontSize: '0.95rem'
                  }}>
                    ✓ {skill}
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources Section */}
            {(roadmap.stages[openStage].resources || []).length > 0 && (
              <div>
                <h4 style={{
                  color: '#8b5cf6',
                  fontSize: '1.3rem',
                  marginBottom: '1rem',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  Recommended Resources
                </h4>
                <ul style={{
                  listStyle: 'none',
                  padding: '0',
                  margin: '0'
                }}>
                  {(roadmap.stages[openStage].resources || []).map((resource, idx) => (
                    <li key={idx} style={{
                      color: '#cbd5e1',
                      padding: '1rem',
                      marginBottom: '0.5rem',
                      background: 'rgba(139, 92, 246, 0.1)',
                      borderRadius: '8px',
                      borderLeft: '3px solid #8b5cf6',
                      lineHeight: '1.5',
                      fontSize: '0.95rem'
                    }}>
                      → {resource}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes modalSlideIn {
            from {
              opacity: 0;
              transform: scale(0.9) translateY(-20px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }

          @media (max-width: 768px) {
            .roadmap-visualization > div {
              padding: 1rem !important;
            }
          }
        `}
      </style>
    </div>
  );
}
RoadmapVisualization.propTypes = {
  roadmap: PropTypes.shape({
    title: PropTypes.string.isRequired,
    stages: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        duration: PropTypes.string.isRequired,
        description: PropTypes.string,
        skills: PropTypes.arrayOf(PropTypes.string),
        resources: PropTypes.arrayOf(PropTypes.string)
      })
    ).isRequired
  })
};

export default RoadmapVisualization;