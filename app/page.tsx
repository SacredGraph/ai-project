import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <h1 className="text-4xl font-bold mb-8">Hello world!</h1>
      
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
          className="rounded-lg dark:invert shadow-[0_0_15px_rgba(255,255,255,0.5)]"
        />
        <Image 
          src="https://picsum.photos/300/300"
          alt="Random image from picsum.photos"
          width={300}
          height={300}
          className="rounded-md shadow-md"
        />
        <p className="text-sm text-gray-600">A random beautiful image!</p>
      </div>
      
      <a 
        href="mailto:maxim@sacredgraph.com?subject=Hello%20from%20AI"
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      >
        Contact Me
      </a>
    </div>
  );
}