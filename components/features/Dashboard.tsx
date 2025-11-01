"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, FileText, Database, MapPin, TrendingUp, AlertCircle } from "lucide-react";

interface StateData {
  id: string;
  name: string;
  abbreviation: string;
  policiesCount: number;
  factsCount: number;
  latestPolicy: {
    title: string;
    uploadedAt: string;
  } | null;
  coverageScore: number;
  coverageLevel: "High" | "Medium" | "Low" | "None";
  avgConfidence: number;
  categoriesCovered: string[];
  missingCategories: string[];
}

interface DashboardStats {
  totalStates: number;
  totalPolicies: number;
  totalFacts: number;
  avgFactsPerState: number;
}

export default function Dashboard() {
  const [states, setStates] = useState<StateData[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalStates: 0,
    totalPolicies: 0,
    totalFacts: 0,
    avgFactsPerState: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/states");
      const data = await response.json();
      
      if (data.success) {
        const stateData = data.states;
        setStates(stateData);
        
        const totalStates = stateData.length;
        const totalPolicies = stateData.reduce((sum: number, state: StateData) => sum + state.policiesCount, 0);
        const totalFacts = stateData.reduce((sum: number, state: StateData) => sum + state.factsCount, 0);
        const avgFactsPerState = totalStates > 0 ? Math.round(totalFacts / totalStates) : 0;
        
        setStats({
          totalStates,
          totalPolicies,
          totalFacts,
          avgFactsPerState,
        });
      } else {
        setError("Failed to load dashboard data");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getCoverageStyle = (level: StateData["coverageLevel"]) => {
    switch (level) {
      case "High":
        return { color: "bg-green-100 text-green-800", label: "High" };
      case "Medium":
        return { color: "bg-yellow-100 text-yellow-800", label: "Medium" };
      case "Low":
        return { color: "bg-orange-100 text-orange-800", label: "Low" };
      default:
        return { color: "bg-gray-100 text-gray-800", label: "None" };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <BarChart3 className="w-8 h-8 animate-pulse mx-auto mb-4" />
          <p>Loading dashboard...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total States</p>
                <p className="text-2xl font-bold">{stats.totalStates}</p>
              </div>
              <MapPin className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Policies</p>
                <p className="text-2xl font-bold">{stats.totalPolicies}</p>
              </div>
              <FileText className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Extracted Facts</p>
                <p className="text-2xl font-bold">{stats.totalFacts.toLocaleString()}</p>
              </div>
              <Database className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Facts/State</p>
                <p className="text-2xl font-bold">{stats.avgFactsPerState}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* State Coverage */}
      <Card>
        <CardHeader>
          <CardTitle>State Coverage Overview</CardTitle>
          <CardDescription>
            Policy analysis coverage across all states
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {states
              .sort((a, b) => b.coverageScore - a.coverageScore)
              .map((state) => {
                const coverage = getCoverageStyle(state.coverageLevel);
                return (
                  <div key={state.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{state.name}</p>
                        <Badge className={coverage.color}>
                          {coverage.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>{state.policiesCount} policies</span>
                        <span>{state.factsCount} facts</span>
                        <span>{state.coverageScore}% categories covered</span>
                        <span>{Math.round(state.avgConfidence * 100)}% avg confidence</span>
                      </div>
                      {state.missingCategories.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Missing: {state.missingCategories.join(", ")}
                        </p>
                      )}
                      {state.latestPolicy && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Updated: {formatDate(state.latestPolicy.uploadedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Coverage Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Coverage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { level: "High Coverage", count: states.filter(s => s.coverageLevel === "High").length, color: "bg-green-500" },
                { level: "Medium Coverage", count: states.filter(s => s.coverageLevel === "Medium").length, color: "bg-yellow-500" },
                { level: "Low Coverage", count: states.filter(s => s.coverageLevel === "Low").length, color: "bg-orange-500" },
                { level: "No Coverage", count: states.filter(s => s.coverageLevel === "None").length, color: "bg-gray-500" },
              ].map((item) => (
                <div key={item.level} className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded ${item.color}`} />
                  <div className="flex-1 flex justify-between">
                    <span className="text-sm">{item.level}</span>
                    <span className="text-sm font-medium">{item.count} states</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing States</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {states
                .sort((a, b) => b.coverageScore - a.coverageScore || b.avgConfidence - a.avgConfidence)
                .slice(0, 5)
                .map((state, index) => (
                  <div key={state.id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{state.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {state.coverageScore}% coverage • {Math.round(state.avgConfidence * 100)}% confidence
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
