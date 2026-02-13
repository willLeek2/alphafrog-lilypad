import { ReactNode } from "react";
import { Link } from "react-router-dom";

type AuthLayoutProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
};

const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sky-50 px-4 py-12 sm:px-6 lg:px-8 font-body">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-block">
             <div className="flex items-center justify-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg shadow-sky-200">
                  <span className="text-xl font-bold text-white">AF</span>
                </div>
                <span className="font-display text-2xl font-bold text-ink-900">AlphaFrog</span>
              </div>
          </Link>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-ink-900">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 text-sm text-ink-600">
              {subtitle}
            </p>
          )}
        </div>
        
        <div className="bg-white px-6 py-8 shadow-glow rounded-3xl border border-sky-100 sm:px-10">
            {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
