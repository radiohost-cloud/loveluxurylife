
import React, { useState, useEffect, useRef } from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';

// from hooks/useLocalStorage.ts
function useLocalStorage(key, initialValue, preferInitialValue = false) {
  const [storedValue, setStoredValue] = useState(() => {
    if (preferInitialValue) {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      const valueToStore =
        typeof storedValue === 'function'
          ? storedValue(storedValue)
          : storedValue;
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

// from components/LinkCard.tsx
const LinkCard = ({ link }) => {
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const handleClick = (e) => {
    if (isMobile && link.mobileUrl) {
      e.preventDefault();

      const handleVisibilityChange = () => {
        // If the tab becomes hidden, it means the app probably opened successfully.
        // In that case, we cancel the fallback.
        if (document.hidden) {
          clearTimeout(fallbackTimeout);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);

      const fallbackTimeout = setTimeout(() => {
        // Clean up the listener after the timeout has passed.
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        // If the tab is still visible after the delay, the app likely didn't open.
        // We check `!document.hidden` one last time just in case.
        if (!document.hidden) {
           window.open(link.url, '_blank', 'noopener,noreferrer');
        }
      }, 2500);

      // Attempt to open the native app
      window.location.href = link.mobileUrl;
    }
  };

  return (
    React.createElement('div', { className: "relative flex items-center group w-full" },
      React.createElement('a', {
        href: link.url,
        target: "_blank",
        rel: "noopener noreferrer",
        onClick: handleClick,
        className: "w-full text-center bg-gray-800/50 backdrop-blur-sm text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 hover:bg-red-500/20 transform hover:-translate-y-1 shadow-lg"
      },
      link.title
      )
    )
  );
};

// from components/YouTubeLatestVideos.tsx
const VIDEO_SOURCES = Array.from({ length: 20 }, (_, i) => `https://github.com/radiohost-cloud/loveluxurylife/raw/main/background/${i + 1}.mp4`);

const VideoBackground = () => {
  const videoRef1 = useRef(null);
  const videoRef2 = useRef(null);
  const [activePlayer, setActivePlayer] = useState(1);
  const activePlayerRef = useRef(activePlayer);

  useEffect(() => {
      activePlayerRef.current = activePlayer;
  }, [activePlayer]);
  
  const [videoSources, setVideoSources] = useState(() => {
      const firstIndex = Math.floor(Math.random() * VIDEO_SOURCES.length);
      let secondIndex;
      do {
          secondIndex = Math.floor(Math.random() * VIDEO_SOURCES.length);
      } while (secondIndex === firstIndex);
      return { player1: VIDEO_SOURCES[firstIndex], player2: VIDEO_SOURCES[secondIndex] };
  });

  const scheduleNextVideo = (playerToUpdate) => {
      const currentSrc1 = videoRef1.current?.src || '';
      const currentSrc2 = videoRef2.current?.src || '';
      let newSrc;
      do {
          const randomIndex = Math.floor(Math.random() * VIDEO_SOURCES.length);
          newSrc = VIDEO_SOURCES[randomIndex];
      } while (newSrc === currentSrc1 || newSrc === currentSrc2);
      
      setVideoSources(prev => ({ ...prev, [playerToUpdate]: newSrc }));
  };
  
  const handleTransition = () => {
      const currentPlayer = activePlayerRef.current;
      const nextPlayer = currentPlayer === 1 ? 2 : 1;
      const nextVideoElement = (nextPlayer === 1 ? videoRef1 : videoRef2).current;

      if (nextVideoElement) {
          const playAndTransition = () => {
              const playPromise = nextVideoElement.play();
              if (playPromise !== undefined) {
                  playPromise
                      .then(() => {
                          setActivePlayer(nextPlayer);
                          setTimeout(() => {
                              scheduleNextVideo(currentPlayer === 1 ? 'player1' : 'player2');
                          }, 1000);
                      })
                      .catch((error) => {
                          if (error.name !== 'AbortError') {
                              console.error(`Video player ${nextPlayer} failed to play. Scheduling new video.`, error);
                              scheduleNextVideo(nextPlayer === 1 ? 'player1' : 'player2');
                          }
                      });
              }
          };
          
          if (nextVideoElement.readyState >= 4) { // HAVE_ENOUGH_DATA
              playAndTransition();
          } else {
              nextVideoElement.addEventListener('canplaythrough', playAndTransition, { once: true });
              nextVideoElement.load();
          }
      }
  };

  const handlePlayerError = (playerWithError) => {
      console.warn(`Video player ${playerWithError} error. Scheduling new source.`);
      scheduleNextVideo(playerWithError === 1 ? 'player1' : 'player2');
      if (activePlayerRef.current === playerWithError) {
          handleTransition();
      }
  };

  useEffect(() => {
      const videoElement1 = videoRef1.current;
      const videoElement2 = videoRef2.current;

      if (!videoElement1 || !videoElement2) return;

      const attemptInitialPlay = () => {
          videoElement1.play().catch(error => {
              if (error.name !== 'AbortError') {
                  console.warn("Browser prevented initial autoplay for video 1, trying video 2.", error);
                  handleTransition();
              }
          });
      };
      
      videoElement1.addEventListener('canplaythrough', attemptInitialPlay, { once: true });
      
      videoElement1.load();
      videoElement2.load();

      return () => {
          if(videoElement1) videoElement1.removeEventListener('canplaythrough', attemptInitialPlay);
          if (videoRef1.current) videoRef1.current.pause();
          if (videoRef2.current) videoRef2.current.pause();
      };
  }, []); // Should only run on mount

  return (
      React.createElement('div', { className: "fixed inset-0 -z-10 bg-black", "aria-hidden": "true" },
          React.createElement('video', {
              ref: videoRef1,
              src: videoSources.player1,
              muted: true,
              playsInline: true,
              onEnded: handleTransition,
              onError: () => handlePlayerError(1),
              className: `w-full h-full object-cover absolute top-0 left-0 transition-opacity duration-1000 ease-in-out ${activePlayer === 1 ? 'opacity-100' : 'opacity-0'}`,
              preload: "auto"
          }),
          React.createElement('video', {
              ref: videoRef2,
              src: videoSources.player2,
              muted: true,
              playsInline: true,
              onEnded: handleTransition,
              onError: () => handlePlayerError(2),
              className: `w-full h-full object-cover absolute top-0 left-0 transition-opacity duration-1000 ease-in-out ${activePlayer === 2 ? 'opacity-100' : 'opacity-0'}`,
              preload: "auto"
          }),
          React.createElement('div', { className: "absolute inset-0 bg-black/60 backdrop-blur-sm" })
      )
  );
};

// from App.tsx
const DEFAULT_PROFILE = {
  avatarUrl: "https://github.com/radiohost-cloud/loveluxurylife/raw/main/avatar.jpg",
  name: '#LLL',
  bio: 'Curating the finest in luxury, fashion, and style. A life of wealth and taste, set to a soundtrack of chill fashion music. Explore our exclusive world below.',
};

const DEFAULT_LINKS = [
  { id: '1', title: 'Youtube', url: 'https://www.youtube.com/@radioluxurylove', mobileUrl: 'youtube://www.youtube.com/@radioluxurylove' },
  { id: '2', title: 'Instagram', url: 'https://www.instagram.com/channel/Abbtoj2Ysc3rcLAG/', mobileUrl: 'instagram://channel?id=Abbtoj2Ysc3rcLAG' },
  { id: '3', title: 'TikTok', url: 'https://www.tiktok.com/@radiomore.love', mobileUrl: 'tiktok://user?username=radiomore.love' },
  { id: '4', title: 'Facebook', url: 'https://www.facebook.com/share/1At1j1eXh1/?mibextid=wwXIfr', mobileUrl: 'fb://facewebmodal/f?href=https://www.facebook.com/share/1At1j1eXh1/?mibextid=wwXIfr' },
];

const preloadedState = window.__PRELOADED_STATE__;
const initialProfile = preloadedState?.profile || DEFAULT_PROFILE;
const initialLinks = preloadedState?.links || DEFAULT_LINKS;

const App = () => {
  const [profile] = useLocalStorage('loveluxury-profile', initialProfile, !!preloadedState);
  const [links] = useLocalStorage('loveluxury-links', initialLinks, !!preloadedState);
  
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isPromptVisible, setIsPromptVisible] = useState(true);
  const [isVanishing, setIsVanishing] = useState(false);
  const [shareText, setShareText] = useState('Share');
  const audioRef = useRef(null);
  const streamUrl = 'https://stream.radiohost.cloud/listen/live/radio.mp3';

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPromptVisible(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
      const vanishTimer = setTimeout(() => {
        setIsVanishing(true);
      }, 10000);
      return () => clearTimeout(vanishTimer);
  }, []);

  useEffect(() => {
      const scriptId = 'json-ld-structured-data';
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
          existingScript.remove();
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';

      let logoUrl = '';
      if (profile.avatarUrl) {
          try {
              logoUrl = new URL(profile.avatarUrl, window.location.href).href;
          } catch (e) {
              console.error('Could not create a valid URL for the logo:', profile.avatarUrl, e);
          }
      }

      const structuredData = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": profile.name,
        "url": window.location.href,
        "logo": logoUrl,
        "description": profile.bio,
        "sameAs": links.map(link => link.url)
      };
      script.innerHTML = JSON.stringify(structuredData, null, 2);
      document.head.appendChild(script);

      return () => {
          const scriptOnCleanup = document.getElementById(scriptId);
          if (scriptOnCleanup) {
            scriptOnCleanup.remove();
          }
      }
  }, [profile, links]);

  useEffect(() => {
      audioRef.current = new Audio(streamUrl);
      const audio = audioRef.current;
      
      return () => {
        if (audio) {
          audio.pause();
        }
      };
  }, []);

  const togglePlayPause = () => {
      if (!audioRef.current) return;

      if (isMusicPlaying) {
          audioRef.current.pause();
          setIsMusicPlaying(false);
      } else {
          audioRef.current.play()
              .then(() => {
                  setIsMusicPlaying(true);
              })
              .catch(error => {
                  console.error("Audio playback failed:", error);
                  setIsMusicPlaying(false);
              });
      }
  };

  const handleShare = () => {
      const shareData = {
        title: document.title,
        text: `${profile.name} - ${profile.bio}`,
        url: window.location.href,
      };

      if (navigator.share) {
        navigator.share(shareData)
          .catch((error) => console.log('Error sharing:', error));
      } else {
        navigator.clipboard.writeText(window.location.href)
          .then(() => {
            setShareText('Copied!');
            setTimeout(() => setShareText('Share'), 2000);
          })
          .catch(err => {
            console.error('Failed to copy text: ', err);
            setShareText('Error!');
            setTimeout(() => setShareText('Share'), 2000);
          });
      }
  };

  const ShareSvgIcon = () => React.createElement('svg', {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      fill: "currentColor",
      className: "w-5 h-5 mr-2"
  }, React.createElement('path', {
      d: "M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3z"
  }));


  return (
    React.createElement('div', { className: "min-h-screen text-white selection:bg-red-500/30 relative overflow-hidden" },
      React.createElement(VideoBackground, null),
      React.createElement('div', { className: "absolute top-4 left-4 sm:top-6 sm:left-6 z-50 flex items-center" },
        React.createElement('button', {
            onClick: togglePlayPause,
            className: "w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-lg p-0 border-0 bg-transparent focus:outline-none transition-transform duration-300 hover:scale-105 active:scale-100 shrink-0",
            'aria-label': isMusicPlaying ? 'Pause music' : 'Play music'
        },
            React.createElement('img', { 
                src: profile.avatarUrl, 
                alt: `Logo for ${profile.name} - Curators of luxury, fashion, and style`, 
                className: `w-full h-full rounded-full object-cover transition-opacity duration-300 ${isMusicPlaying ? 'animate-spin-vinyl opacity-50' : 'opacity-100'}`
            })
        ),
        !isMusicPlaying && isPromptVisible && React.createElement('div', {
            className: "ml-3 flex items-center bg-gray-900/50 backdrop-blur-sm rounded-lg p-2 px-4 animate-pulse-bounce shadow-lg"
          },
          React.createElement('div', null,
              React.createElement('p', { className: "text-white text-sm font-bold hidden sm:block" }, "Click the logo to play music"),
              React.createElement('p', { className: "text-white text-sm font-bold sm:hidden" }, "Tap the logo to play music")
          )
        )
      ),
      React.createElement('div', { className: "container mx-auto px-4 py-8 md:py-16 relative z-10" },
        React.createElement('main', { className: "max-w-xl mx-auto flex flex-col items-center pt-32" },
          React.createElement('div', { style: { perspective: '1000px' } },
              React.createElement('h1', { className: `text-4xl md:text-5xl font-bold text-center mb-2 ${isVanishing ? 'animate-rotate-and-fade' : ''}` }, profile.name),
              React.createElement('p', { className: `text-lg text-gray-300 text-center mb-8 ${isVanishing ? 'animate-rotate-and-fade' : ''}` }, profile.bio)
          ),
          React.createElement('div', { className: "w-full flex flex-col items-center space-y-5" },
            links.map((link) => 
              React.createElement(LinkCard, { 
                key: link.id, 
                link: link 
              })
            )
          )
        )
      ),
      React.createElement('div', { className: "fixed bottom-5 left-1/2 -translate-x-1/2 z-50" },
        React.createElement('button', {
            onClick: handleShare,
            className: "flex items-center justify-center bg-gray-800/50 backdrop-blur-sm text-white font-semibold py-2 px-5 rounded-lg transition-all duration-300 hover:bg-red-500/20 transform hover:-translate-y-1 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/50 focus:ring-red-500"
        },
            React.createElement(ShareSvgIcon, null),
            React.createElement('span', null, shareText)
        )
      )
    )
  );
};

// from index.tsx
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  React.createElement(React.StrictMode, null,
    React.createElement(App, null)
  )
);
