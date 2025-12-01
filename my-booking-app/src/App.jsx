import LandingPage from "./Landing_page"

function App() {
  // I keep App super light: it's basically just handing the shell to LandingPage.
  return (
    <>
      {/* Everything else is handled inside LandingPage so this stays tidy. */}
      <LandingPage />
    </>
  )
}

export default App
