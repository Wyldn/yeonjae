import React from 'react'
import ReactDOM from 'react-dom/client'
import { useRoute } from './router.jsx'
import Shell from './components/Shell.jsx'
import Home from './pages/Home.jsx'
import Browse from './pages/Browse.jsx'
import Title from './pages/Title.jsx'
import Reader from './pages/Reader.jsx'
import Library from './pages/Library.jsx'
import History from './pages/History.jsx'
import './styles.css'

function App() {
  const { path } = useRoute()

  // Scroll to top on page change (reader manages its own scroll)
  React.useEffect(() => {
    if (!path.startsWith('/read/')) window.scrollTo(0, 0)
  }, [path])

  let page
  const parts = path.split('/').filter(Boolean)
  if (path === '/') page = <Home />
  else if (parts[0] === 'browse') page = <Browse />
  else if (parts[0] === 'title' && parts[1]) page = <Title id={parts[1]} />
  else if (parts[0] === 'read' && parts[1] && parts[2]) page = <Reader id={parts[1]} chapterId={parts[2]} />
  else if (parts[0] === 'library') page = <Library />
  else if (parts[0] === 'history') page = <History />
  else page = <Home />

  return <Shell>{page}</Shell>
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
