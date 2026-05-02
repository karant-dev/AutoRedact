export function Footer() {
    return (
        <footer className="border-t border-slate-800 mt-auto py-6">
            <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
                {/* Left: branding */}
                <div className="text-center md:text-left">
                    <p className="font-medium text-slate-400">AutoRedact</p>
                    <p className="text-xs text-slate-500">No manual work needed. Built with 🛡️.</p>
                </div>

                {/* Centre: GitHub + author */}
                <div className="flex items-center gap-4">
                    <a
                        href="https://github.com/karant-dev/AutoRedact"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View AutoRedact on GitHub"
                        className="text-slate-500 hover:text-slate-200 transition-colors duration-200"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.468-2.382 1.236-3.222-.124-.303-.536-1.523.117-3.176 0 0 1.008-.322 3.3 1.23A11.52 11.52 0 0 1 12 6.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.655 1.653.243 2.873.12 3.176.77.84 1.235 1.911 1.235 3.222 0 4.61-2.804 5.625-5.476 5.922.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                        </svg>
                    </a>
                    <span className="text-slate-600 text-xs">
                        Made by{' '}
                        <a
                            href="https://karant.dev"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-slate-200 underline underline-offset-2 transition-colors duration-200"
                        >
                            Karan Thakkar
                        </a>
                    </span>
                </div>

                {/* Right: disclaimer */}
                <div className="text-center md:text-right max-w-md">
                    <p className="text-[10px] text-slate-600 leading-tight">
                        <strong>Disclaimer:</strong> Automated detection may be imperfect—verify results. Provided "as-is" without warranty or liability. 100% Local Processing.
                    </p>
                </div>
            </div>
        </footer>
    );
}

