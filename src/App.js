import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import styled from 'styled-components';

const AppContainer = styled.div`
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f7f7f7;
  min-height: 100vh;
`;

const Header = styled.header`
  background-color: #000;
  color: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  margin: 0;
  font-size: 2rem;
`;

const Subtitle = styled.p`
  margin: 5px 0 0;
  font-size: 1rem;
  opacity: 0.8;
`;

const Dashboard = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
  gap: 20px;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
`;

const CardTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
`;

const ChartContainer = styled.div`
  height: 300px;
  width: 100%;
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
`;

const MetricCard = styled.div`
  background-color: ${({ bgColor }) => bgColor || '#f0f0f0'};
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  color: ${({ textColor }) => textColor || '#000'};
`;

const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  margin: 10px 0;
`;

const MetricLabel = styled.div`
  font-size: 0.9rem;
  opacity: 0.8;
`;

const UpdateInfo = styled.div`
  text-align: center;
  font-size: 0.9rem;
  color: #666;
  margin-top: 20px;
`;

const ErrorMessage = styled.div`
  background-color: #ffebee;
  color: #c62828;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
`;

const LoadingMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 500px;
  font-size: 1.2rem;
  color: #666;
`;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// Date formatter for charts
const formatDate = (timestamp) => {
  if (!timestamp) return '';
  try {
    return format(parseISO(timestamp), 'MMM d');
  } catch (e) {
    return timestamp;
  }
};

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <p>{`Date: ${label}`}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function App() {
  const [whoopData, setWhoopData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // In a real deployment, this would be the JSON data updated by GitHub Actions
        const response = await fetch('./data/all-data.json');
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setWhoopData(data);
        setLastUpdated(data.lastUpdated || new Date().toISOString());
      } catch (err) {
        console.error('Error fetching Whoop data:', err);
        setError(err.message);
        
        // For development, load sample data if the file doesn't exist yet
        try {
          const sampleData = await import('./sample-data.json');
          setWhoopData(sampleData.default);
          setLastUpdated(new Date().toISOString());
        } catch (sampleErr) {
          // No sample data available
        }
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // Prepare data for charts
  const prepareRecoveryChart = (data) => {
    if (!data || !data.recovery || !Array.isArray(data.recovery)) return [];
    
    return data.recovery.slice(-14).map(item => ({
      date: formatDate(item.timestamp),
      'Recovery Score': item.score || 0,
      'Resting HR': item.restingHeartRate || 0,
      'HRV': item.heartRateVariability || 0
    })).reverse();
  };
  
  const prepareSleepChart = (data) => {
    if (!data || !data.sleep || !Array.isArray(data.sleep)) return [];
    
    return data.sleep.slice(-14).map(item => ({
      date: formatDate(item.timestamp),
      'Hours': (item.durationInSeconds || 0) / 3600,
      'Score': item.score || 0
    })).reverse();
  };
  
  const prepareWorkoutChart = (data) => {
    if (!data || !data.workout || !Array.isArray(data.workout)) return [];
    
    return data.workout.slice(-14).map(item => ({
      date: formatDate(item.timestamp),
      'Strain': item.strain || 0,
      'Calories': item.caloriesBurned || 0 / 100 // Scale calories for better chart visualization
    })).reverse();
  };
  
  // Prepare summary metrics
  const getLatestRecovery = (data) => {
    if (!data || !data.recovery || !Array.isArray(data.recovery) || data.recovery.length === 0) {
      return { score: 0, restingHeartRate: 0, heartRateVariability: 0 };
    }
    return data.recovery[0];
  };
  
  const getLatestSleep = (data) => {
    if (!data || !data.sleep || !Array.isArray(data.sleep) || data.sleep.length === 0) {
      return { score: 0, durationInSeconds: 0 };
    }
    return data.sleep[0];
  };
  
  const getLatestWorkout = (data) => {
    if (!data || !data.workout || !Array.isArray(data.workout) || data.workout.length === 0) {
      return { strain: 0, caloriesBurned: 0 };
    }
    return data.workout[0];
  };
  
  // Calculate recovery color based on score
  const getRecoveryColor = (score) => {
    if (score >= 67) return { bg: '#d3f0d3', text: '#2e7d32' }; // Green
    if (score >= 34) return { bg: '#fff8e1', text: '#ff8f00' }; // Yellow
    return { bg: '#ffebee', text: '#c62828' }; // Red
  };
  
  if (loading) {
    return (
      <AppContainer>
        <Header>
          <Title>Whoop Dashboard</Title>
          <Subtitle>Loading your fitness data...</Subtitle>
        </Header>
        <LoadingMessage>Loading Whoop data...</LoadingMessage>
      </AppContainer>
    );
  }
  
  if (error && !whoopData) {
    return (
      <AppContainer>
        <Header>
          <Title>Whoop Dashboard</Title>
          <Subtitle>Something went wrong</Subtitle>
        </Header>
        <ErrorMessage>
          <h2>Error Loading Data</h2>
          <p>{error}</p>
          <p>Make sure you've completed the OAuth setup and have run the GitHub Action to fetch data.</p>
        </ErrorMessage>
      </AppContainer>
    );
  }
  
  // Format data for charts
  const recoveryChartData = prepareRecoveryChart(whoopData);
  const sleepChartData = prepareSleepChart(whoopData);
  const workoutChartData = prepareWorkoutChart(whoopData);
  
  // Get latest metrics
  const latestRecovery = getLatestRecovery(whoopData);
  const latestSleep = getLatestSleep(whoopData);
  const latestWorkout = getLatestWorkout(whoopData);
  
  // Calculate colors
  const recoveryColors = getRecoveryColor(latestRecovery.score);
  
  return (
    <AppContainer>
      <Header>
        <Title>Whoop Dashboard</Title>
        <Subtitle>Your personal fitness tracker</Subtitle>
      </Header>
      
      {/* Summary Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Summary</CardTitle>
        </CardHeader>
        <MetricGrid>
          <MetricCard bgColor={recoveryColors.bg} textColor={recoveryColors.text}>
            <MetricLabel>Recovery Score</MetricLabel>
            <MetricValue>{latestRecovery.score || 0}%</MetricValue>
          </MetricCard>
          
          <MetricCard>
            <MetricLabel>Resting Heart Rate</MetricLabel>
            <MetricValue>{latestRecovery.restingHeartRate || 0}</MetricValue>
          </MetricCard>
          
          <MetricCard>
            <MetricLabel>Heart Rate Variability</MetricLabel>
            <MetricValue>{latestRecovery.heartRateVariability || 0}ms</MetricValue>
          </MetricCard>
          
          <MetricCard>
            <MetricLabel>Sleep Score</MetricLabel>
            <MetricValue>{latestSleep.score || 0}%</MetricValue>
          </MetricCard>
          
          <MetricCard>
            <MetricLabel>Sleep Duration</MetricLabel>
            <MetricValue>
              {latestSleep.durationInSeconds ? (latestSleep.durationInSeconds / 3600).toFixed(1) : 0}h
            </MetricValue>
          </MetricCard>
          
          <MetricCard>
            <MetricLabel>Daily Strain</MetricLabel>
            <MetricValue>{latestWorkout.strain || 0}</MetricValue>
          </MetricCard>
        </MetricGrid>
      </Card>
      
      <Dashboard>
        {/* Recovery Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Recovery Trends</CardTitle>
          </CardHeader>
          <ChartContainer>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recoveryChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" orientation="left" domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="Recovery Score"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Resting HR"
                  stroke="#ff5722"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="HRV"
                  stroke="#4caf50"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>
        
        {/* Sleep Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sleep Analysis</CardTitle>
          </CardHeader>
          <ChartContainer>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sleepChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" orientation="left" domain={[0, 12]} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="Hours" fill="#3f51b5" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Score"
                  stroke="#f44336"
                  strokeWidth={2}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>
        
        {/* Workout Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Workout Strain</CardTitle>
          </CardHeader>
          <ChartContainer>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={workoutChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" orientation="left" domain={[0, 21]} />
                <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="Strain"
                  stroke="#ff9800"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Calories"
                  stroke="#e91e63"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>
        
        {/* Weekly Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Recovery Distribution</CardTitle>
          </CardHeader>
          <ChartContainer>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Green (67-100%)', value: recoveryChartData.filter(d => d['Recovery Score'] >= 67).length },
                    { name: 'Yellow (34-66%)', value: recoveryChartData.filter(d => d['Recovery Score'] >= 34 && d['Recovery Score'] < 67).length },
                    { name: 'Red (0-33%)', value: recoveryChartData.filter(d => d['Recovery Score'] < 34).length }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {recoveryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#4caf50', '#ff9800', '#f44336'][index % 3]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>
      </Dashboard>
      
      {lastUpdated && (
        <UpdateInfo>
          Last updated: {format(parseISO(lastUpdated), 'MMMM d, yyyy h:mm a')}
        </UpdateInfo>
      )}
    </AppContainer>
  );
}

export default App;