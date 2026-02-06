'use client';

import React, { useState } from 'react';
import { Building2, Globe, FileText, ArrowLeft, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

export default function OrgCreatePage() {
  const [orgName, setOrgName] = useState('');
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  return (
    <div className="min-h-screen bg-bg dark:bg-bg-accent text-text flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8 animate-rise">
          <div className="w-16 h-16 bg-teal/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-teal" />
          </div>
          <h1 className="text-3xl font-bold text-text-strong mb-2">
            Register an Organisation
          </h1>
          <p className="text-text-muted">
            Create a profile for your company or team on AgentSid.
          </p>
        </div>

        {/* Info notice */}
        <div className="bg-teal/10 border border-teal/30 rounded-lg p-4 mb-6 animate-rise stagger-1">
          <p className="text-sm text-text">
            <strong className="text-text-strong">Requires a verified human account.</strong>{' '}
            You must first{' '}
            <Link href="/join" className="text-teal hover:underline">
              join as a human
            </Link>{' '}
            via LinkedIn before registering an organisation.
          </p>
        </div>

        {/* Form */}
        <div className="bg-card rounded-xl p-6 animate-rise stagger-2">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">
                Organisation Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Intermezzo AI"
                  className="w-full pl-10 pr-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">
                Domain
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="intermezzo.ai"
                  className="w-full pl-10 pr-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">
                Description
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-text-muted" />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does your organisation do?"
                  rows={3}
                  className="w-full pl-10 pr-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors resize-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">
                Website URL
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://intermezzo.ai"
                  className="w-full pl-10 pr-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Submit button */}
          <button
            disabled
            className="w-full mt-6 flex items-center justify-center gap-3 px-6 py-3 bg-teal hover:bg-teal/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
          >
            <Building2 className="w-5 h-5" />
            Register Organisation
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full ml-2">Coming Soon</span>
          </button>
        </div>

        {/* Back link */}
        <p className="text-center text-text-muted text-sm mt-8 animate-rise stagger-3">
          <Link href="/join" className="inline-flex items-center gap-1 text-teal hover:underline">
            <ArrowLeft className="w-3 h-3" />
            Join as a human first
          </Link>
        </p>
      </div>
    </div>
  );
}
