import LandingPage from "./Landing_page"

function App() {
  // App is intentionally tiny: it only mounts the main landing shell.
  return (
    <>
      {/* Everything else is handled inside LandingPage so this stays tidy. */}
      <LandingPage />
    </>
  )
}

export default App
