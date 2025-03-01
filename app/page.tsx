export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-[family-name:var(--font-geist-sans)] gap-6">
      <h1 className="text-4xl font-bold">Hello world!</h1>
      <a 
        href="mailto:maxim@sacredgraph.com?subject=Hello%20from%20AI"
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      >
        Contact Me
      </a>
    </div>
  );
}
