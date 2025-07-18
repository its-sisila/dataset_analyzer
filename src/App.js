import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Papa from "papaparse";
import _ from "lodash";

const App = () => {
  const [data, setData] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [keywordStats, setKeywordStats] = useState([]);
  const [uniqueKeywords, setUniqueKeywords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [csvFile, setCsvFile] = useState(null);

  // Color palette for charts
  const colors = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7c7c",
    "#8dd1e1",
    "#d084d0",
    "#ffb347",
    "#87ceeb",
  ];

  // Function to normalize and deduplicate keywords
  const normalizeKeywords = (keywordString) => {
    if (!keywordString) return [];

    const keywords = keywordString
      .toLowerCase()
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    // Remove duplicates and similar keywords
    const uniqueKeywords = [];
    const seen = new Set();

    keywords.forEach((keyword) => {
      // Check for exact matches first
      if (seen.has(keyword)) return;

      // Check for similar keywords (plurals, slight variations)
      const isSimilar = Array.from(seen).some((seenKeyword) => {
        // Check if one is a substring of another (with some tolerance)
        const shorter =
          keyword.length < seenKeyword.length ? keyword : seenKeyword;
        const longer =
          keyword.length >= seenKeyword.length ? keyword : seenKeyword;

        // If shorter is contained in longer and they're similar enough
        if (longer.includes(shorter) && shorter.length > 2) {
          return true;
        }

        // Check for common plural/singular patterns
        if (keyword.endsWith("s") && seenKeyword === keyword.slice(0, -1))
          return true;
        if (seenKeyword.endsWith("s") && keyword === seenKeyword.slice(0, -1))
          return true;

        return false;
      });

      if (!isSimilar) {
        uniqueKeywords.push(keyword);
        seen.add(keyword);
      }
    });

    return uniqueKeywords;
  };

  // Function to analyze the dataset
  const analyzeDataset = (csvContent) => {
    try {
      setLoading(true);
      setError(null);

      // Parse CSV
      const parsedData = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        delimitersToGuess: [",", ";", "|", "\t"],
      });

      if (parsedData.errors.length > 0) {
        console.warn("CSV parsing warnings:", parsedData.errors);
      }

      const cleanData = parsedData.data.filter(
        (row) => row.category && row.keywords
      );
      setData(cleanData);

      // Calculate category statistics
      const categoryGroups = _.groupBy(cleanData, "category");
      const totalRecords = cleanData.length;

      const categoryPercentages = Object.entries(categoryGroups)
        .map(([category, records]) => ({
          category: category.trim(),
          count: records.length,
          percentage: ((records.length / totalRecords) * 100).toFixed(2),
        }))
        .sort((a, b) => b.count - a.count);

      setCategoryStats(categoryPercentages);

      // Extract and normalize all keywords
      const allKeywords = [];
      cleanData.forEach((row) => {
        const keywords = normalizeKeywords(row.keywords);
        keywords.forEach((keyword) => {
          allKeywords.push({
            keyword,
            category: row.category.trim(),
            department: row.department,
          });
        });
      });

      // Calculate keyword statistics
      const keywordGroups = _.groupBy(allKeywords, "keyword");
      const totalKeywords = allKeywords.length;

      const keywordPercentages = Object.entries(keywordGroups)
        .map(([keyword, instances]) => ({
          keyword,
          count: instances.length,
          percentage: ((instances.length / totalKeywords) * 100).toFixed(2),
          categories: [...new Set(instances.map((i) => i.category))],
          departments: [...new Set(instances.map((i) => i.department))],
        }))
        .sort((a, b) => b.count - a.count);

      setKeywordStats(keywordPercentages);

      // Get unique keywords list
      const uniqueKeywordsList = Object.keys(keywordGroups).sort();
      setUniqueKeywords(uniqueKeywordsList);

      setLoading(false);
    } catch (err) {
      console.error("Error analyzing dataset:", err);
      setError("Error analyzing dataset: " + err.message);
      setLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "text/csv") {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        analyzeDataset(e.target.result);
      };
      reader.readAsText(file);
    } else {
      setError("Please upload a valid CSV file");
    }
  };

  const downloadResults = () => {
    const results = {
      summary: {
        totalRecords: data.length,
        totalCategories: categoryStats.length,
        totalUniqueKeywords: uniqueKeywords.length,
        analysisDate: new Date().toISOString(),
      },
      categoryAnalysis: categoryStats,
      keywordAnalysis: keywordStats,
      uniqueKeywords: uniqueKeywords,
    };

    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dataset_analysis_results.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing dataset...</p>
        </div>
      </div>
    );
  }

  if (!csvFile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Dataset Analysis Tool
          </h1>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block"
            >
              Upload CSV File
            </label>
            <p className="text-gray-500 mt-2">
              Select your dataset.csv file to analyze
            </p>
          </div>
          {error && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              Dataset Analysis Dashboard
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                Upload New File
              </button>
              <button
                onClick={downloadResults}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Download Results
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-100 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800">
                Total Records
              </h3>
              <p className="text-2xl font-bold text-blue-600">{data.length}</p>
            </div>
            <div className="bg-green-100 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800">
                Categories
              </h3>
              <p className="text-2xl font-bold text-green-600">
                {categoryStats.length}
              </p>
            </div>
            <div className="bg-purple-100 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-800">
                Unique Keywords
              </h3>
              <p className="text-2xl font-bold text-purple-600">
                {uniqueKeywords.length}
              </p>
            </div>
            <div className="bg-orange-100 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-orange-800">
                Total Keywords
              </h3>
              <p className="text-2xl font-bold text-orange-600">
                {keywordStats.reduce((sum, k) => sum + k.count, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Category Analysis */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Category Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [value + "%", "Percentage"]}
                />
                <Bar dataKey="percentage" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Pie Chart */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Category Distribution (Pie)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) =>
                    `${category}: ${percentage}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {categoryStats.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Category Table */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Category Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Category
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Count
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoryStats.map((category, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 font-medium">
                      {category.category}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {category.count}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {category.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Keywords */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Top Keywords (After Deduplication)
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={keywordStats.slice(0, 15)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="keyword"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [value + "%", "Percentage"]}
              />
              <Bar dataKey="percentage" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Keyword Analysis Table */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Keyword Analysis
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Keyword
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Count
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Percentage
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Categories
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Departments
                  </th>
                </tr>
              </thead>
              <tbody>
                {keywordStats.slice(0, 20).map((keyword, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 font-medium">
                      {keyword.keyword}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {keyword.count}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {keyword.percentage}%
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span className="text-sm">
                        {keyword.categories.join(", ")}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span className="text-sm">
                        {keyword.departments.join(", ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
