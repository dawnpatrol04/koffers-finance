"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useUser } from "@/contexts/user-context";
import type { Metadata } from "next";

interface APIKey {
  $id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

export default function DeveloperSettings() {
  const { user } = useUser();
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

  useEffect(() => {
    if (user?.$id) {
      fetchKeys();
    }
  }, [user?.$id]);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/keys');
      const data = await response.json();
      if (data.keys) {
        setKeys(data.keys);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const createKey = async () => {
    if (!keyName.trim()) {
      alert('Please enter a key name');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName }),
      });

      const data = await response.json();

      if (response.ok && data.key) {
        setNewKeyValue(data.key.keyValue);
        setKeyName("");
        setShowCreateForm(false);
        fetchKeys(); // Refresh the list
      } else {
        alert(`Failed to create API key: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      alert('Error creating API key');
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/keys/${keyId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchKeys(); // Refresh the list
      } else {
        const data = await response.json();
        alert(`Failed to delete API key: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      alert('Error deleting API key');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* New Key Created Modal */}
      {newKeyValue && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icons.Check className="h-5 w-5 text-green-600" />
              API Key Created
            </CardTitle>
            <CardDescription>
              Copy this key now - you won't be able to see it again!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <code className="flex-1 p-3 bg-muted rounded text-sm font-mono break-all">
                {newKeyValue}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(newKeyValue);
                  alert('Copied to clipboard!');
                }}
              >
                <Icons.Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => setNewKeyValue(null)} className="w-full">
              I've saved my key
            </Button>
          </CardContent>
        </Card>
      )}

      {/* API Keys Management */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Create and manage API keys for MCP server access to your financial data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create New Key Form */}
          {showCreateForm ? (
            <div className="border border-border rounded-lg p-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Key Name</label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g., Claude Desktop MCP"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={createKey} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Key'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setKeyName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowCreateForm(true)}>
              <Icons.Add className="h-4 w-4 mr-2" />
              Create New API Key
            </Button>
          )}

          {/* API Keys List */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No API keys yet. Create one to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.$id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{key.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <code className="bg-muted px-2 py-1 rounded">{key.keyPrefix}</code>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Created {formatDate(key.createdAt)}
                      {key.lastUsedAt && ` • Last used ${formatDate(key.lastUsedAt)}`}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteKey(key.$id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Icons.Delete className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MCP Server Info */}
      <Card>
        <CardHeader>
          <CardTitle>MCP Server Configuration</CardTitle>
          <CardDescription>
            Use your API key to connect Claude Desktop or other MCP clients to your financial data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">MCP Server URL:</div>
            <code className="block p-3 bg-muted rounded text-sm">
              {typeof window !== 'undefined' ? window.location.origin : 'https://koffers.ai'}/api/mcp
            </code>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Example Claude Desktop Config:</div>
            <pre className="p-3 bg-muted rounded text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "koffers": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch",
        "${typeof window !== 'undefined' ? window.location.origin : 'https://koffers.ai'}/api/mcp"
      ],
      "env": {
        "KOFFERS_API_KEY": "your_api_key_here"
      }
    }
  }
}`}
            </pre>
          </div>

          <div className="text-xs text-muted-foreground">
            Learn more about MCP server configuration in our{' '}
            <a href="#" className="text-primary hover:underline">documentation</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
