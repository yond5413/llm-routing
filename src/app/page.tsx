"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { LLMResponse } from '@/lib/providers';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [priority, setPriority] = useState<'quality' | 'cost' | 'latency'>('quality');
  const [response, setResponse] = useState<LLMResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, priority }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'An error occurred');
      }

      const data: LLMResponse = await res.json();
      setResponse(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-2">LLM Router</h1>
        <p className="text-center text-gray-400 mb-8">Enter a prompt and choose a priority to see the routing in action.</p>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle>Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="prompt">Your Prompt</Label>
                  <Input 
                    id="prompt" 
                    placeholder="e.g., Write a python function to sort a list" 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label>Priority</Label>
                  <RadioGroup defaultValue="quality" value={priority} onValueChange={setPriority} className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="quality" id="r1" />
                      <Label htmlFor="r1">Quality</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cost" id="r2" />
                      <Label htmlFor="r2">Cost</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="latency" id="r3" />
                      <Label htmlFor="r3">Latency</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              <Button type="submit" className="w-full mt-6" disabled={isLoading || !prompt">
                {isLoading ? 'Routing...' : 'Submit'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {isLoading && (
          <Card className="mt-8 bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle>Response</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-1/4 bg-gray-700" />
              <Skeleton className="h-20 w-full bg-gray-700" />
              <Skeleton className="h-4 w-1/2 bg-gray-700" />
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="mt-8 bg-red-900/20 border-red-500">
            <CardHeader>
              <CardTitle className="text-red-400">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
            </CardContent>
          </Card>
        )}

        {response && (
          <Card className="mt-8 bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle>Response</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 whitespace-pre-wrap">{response.text}</p>
              <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-400 space-y-2">
                <p><strong>Latency:</strong> {response.latencyMs}ms</p>
                <p><strong>Tokens In:</strong> {response.tokens_in}</p>
                <p><strong>Tokens Out:</strong> {response.tokens_out}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
