export default function WelcomeEditor() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#0f172a]">
      <div className="text-center max-w-lg px-6">
        <h1 className="text-4xl font-bold text-white mb-3">
          Welcome to SyncSpace
        </h1>

        <p className="text-gray-400 mb-8">
          Create a new file or open an existing file to start coding collaboratively.
        </p>

        <div className="mt-10 text-sm text-gray-500">
          <p>💡 Supported Languages</p>
          <p className="mt-2">
            Python • Java • C • C++ • TypeScript
          </p>
        </div>
      </div>
    </div>
  );
}