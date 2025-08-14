# Phase 2: Real-Time Dashboard (Weeks 3-4)

## Overview
Create a comprehensive web-based dashboard that provides real-time insights into developer productivity patterns. The dashboard consumes data from the local SQLite database created in Phase 1 and presents it through an intuitive, responsive interface.

## Agent Assignment
- **Primary Agent**: `frontend-developer` - React/Next.js development and state management
- **Supporting Agent**: `ui-designer` - Design system, user experience, and accessibility

## Objectives
1. Build a modern, responsive web dashboard using Next.js and TypeScript
2. Implement real-time data visualization showing current activity and historical patterns
3. Create focus session management with start/stop/pause controls
4. Design comprehensive project analytics with time allocation views
5. Ensure excellent user experience with smooth animations and responsive design

## Technical Requirements

### Frontend Framework Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS + shadcn/ui components
- **Charts**: Recharts for data visualization
- **State Management**: Zustand for global state
- **Real-time**: Server-Sent Events (SSE) or WebSocket connection
- **Icons**: Lucide React icon library
- **Date Handling**: date-fns for date manipulations

### Core Dashboard Components

#### 1. Real-Time Activity Monitor
```typescript
interface LiveActivityProps {
  currentActivity: ActivityEvent | null;
  isTracking: boolean;
  sessionDuration: number;
  currentProject: Project | null;
}

const LiveActivityMonitor = ({ 
  currentActivity, 
  isTracking, 
  sessionDuration, 
  currentProject 
}: LiveActivityProps) => {
  // Real-time activity display
  // Current session timer
  // Project context indicator
  // Activity type visualization
}
```

**Implementation Tasks for `frontend-developer`:**
- Create live activity card showing current application and project
- Implement session timer with start/stop/pause controls  
- Build activity type indicator with color coding
- Add idle state detection and display
- Create smooth transitions for activity changes

#### 2. Focus Session Dashboard
```typescript
interface FocusSession {
  id: string;
  projectId?: string;
  startTime: Date;
  endTime?: Date;
  goalDuration: number; // minutes
  actualDuration: number; // minutes
  interruptions: number;
  isActive: boolean;
  productivityScore?: number;
}

interface FocusSessionManagerProps {
  activeSessions: FocusSession[];
  onStartSession: (projectId?: string, duration?: number) => void;
  onEndSession: (sessionId: string) => void;
  onPauseSession: (sessionId: string) => void;
}
```

**Implementation Tasks for `frontend-developer`:**
- Design focus session start dialog with project selection
- Create active session display with progress indicator
- Build session history with completion statistics
- Add goal setting and tracking functionality
- Implement session templates (Pomodoro, deep work, etc.)

#### 3. Project Analytics Dashboard
```typescript
interface ProjectAnalytics {
  totalTime: number;
  focusTime: number;
  contextSwitches: number;
  topActivities: Array<{
    type: ActivityType;
    duration: number;
    percentage: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    duration: number;
    focusScore: number;
  }>;
}

const ProjectDashboard = ({ project, analytics, timeRange }: ProjectDashboardProps) => {
  // Project overview metrics
  // Time allocation charts
  // Activity breakdown visualization
  // Historical trend analysis
}
```

**Implementation Tasks for `ui-designer`:**
- Design project overview cards with key metrics
- Create time allocation donut charts and bar graphs
- Build activity timeline with hover interactions
- Design project comparison views
- Create responsive layout for different screen sizes

#### 4. Analytics Visualizations
```typescript
interface ChartComponents {
  TimeAllocationChart: React.FC<{ data: TimeAllocation[] }>;
  ActivityTimelineChart: React.FC<{ data: ActivityEvent[] }>;
  FocusScoreTrendChart: React.FC<{ data: FocusScore[] }>;
  ContextSwitchHeatmap: React.FC<{ data: ContextSwitch[] }>;
  ProductivityComparisonChart: React.FC<{ data: ProductivityMetrics[] }>;
}
```

**Chart Types to Implement:**
- **Time Allocation**: Donut charts showing project time distribution
- **Activity Timeline**: Gantt-style timeline showing daily activity patterns
- **Focus Trends**: Line charts showing productivity scores over time
- **Context Switches**: Heatmap showing switching patterns by hour/day
- **Weekly Comparison**: Bar charts comparing productivity across weeks

### Dashboard Layout & Navigation

#### 1. Main Navigation Structure
```typescript
interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: number;
}

const navigationItems: NavigationItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/' },
  { id: 'focus', label: 'Focus Sessions', icon: Target, path: '/focus' },
  { id: 'projects', label: 'Projects', icon: FolderOpen, path: '/projects' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' }
];
```

**Implementation Tasks for `ui-designer`:**
- Design sidebar navigation with icons and labels
- Create responsive mobile navigation (hamburger menu)
- Implement active state indicators and hover effects
- Add notification badges for important alerts
- Design breadcrumb navigation for nested views

#### 2. Dashboard Pages Structure

**Overview Page** (`/`)
- Real-time activity monitor
- Today's productivity summary
- Recent focus sessions
- Quick project access
- Productivity trends mini-charts

**Focus Sessions Page** (`/focus`)
- Active session controls
- Session history and statistics
- Focus goal setting
- Distraction tracking
- Session templates management

**Projects Page** (`/projects`)
- Project list with time allocation
- Project-specific analytics
- Project comparison tools
- Project settings and tags
- Git integration status

**Analytics Page** (`/analytics`)
- Comprehensive productivity metrics
- Historical trend analysis
- Context switching insights
- Weekly/monthly reports
- Export functionality

**Settings Page** (`/settings`)
- Privacy and tracking preferences
- Dashboard customization options
- Data export and import tools
- Integration configurations
- Application preferences

### Real-Time Data Integration

#### 1. Data Connection Layer
```typescript
interface DataProvider {
  // Connect to local SQLite database
  connectToDatabase(): Promise<Database>;
  
  // Real-time activity updates
  subscribeToActivityUpdates(callback: (activity: ActivityEvent) => void): void;
  
  // Focus session management
  startFocusSession(projectId?: string, duration?: number): Promise<FocusSession>;
  endFocusSession(sessionId: string): Promise<void>;
  
  // Data queries
  getProjectAnalytics(projectId: string, timeRange: TimeRange): Promise<ProjectAnalytics>;
  getActivityLogs(filters: ActivityFilters): Promise<ActivityEvent[]>;
}
```

**Implementation Tasks for `frontend-developer`:**
- Set up SQLite connection from Next.js using better-sqlite3
- Implement real-time updates using Server-Sent Events
- Create data fetching hooks with React Query
- Build caching layer for frequently accessed data
- Handle connection errors and offline states

#### 2. State Management Architecture
```typescript
interface DashboardState {
  // Current activity state
  currentActivity: ActivityEvent | null;
  isTracking: boolean;
  sessionDuration: number;
  
  // Focus session state
  activeFocusSession: FocusSession | null;
  focusSessionHistory: FocusSession[];
  
  // Project state
  selectedProject: Project | null;
  projects: Project[];
  
  // Analytics state
  timeRange: TimeRange;
  analyticsData: Record<string, any>;
  
  // UI state
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
}
```

### UI/UX Design Requirements

#### 1. Design System Implementation
**Color Palette:**
- **Primary**: Blue (#3B82F6) for main actions and focus elements
- **Secondary**: Green (#10B981) for positive metrics and success states
- **Warning**: Amber (#F59E0B) for attention and distraction alerts
- **Danger**: Red (#EF4444) for errors and critical alerts
- **Neutral**: Gray scale for text and background elements

**Typography:**
- **Headings**: Inter font family, weights 600-700
- **Body**: Inter font family, weights 400-500
- **Code**: JetBrains Mono for any code snippets or file paths
- **Scale**: 12px, 14px, 16px, 18px, 24px, 32px, 48px

**Component Library (shadcn/ui):**
```typescript
// Core components to implement
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Input, Select, Switch, Tabs,
  Dialog, Badge, Progress, Tooltip,
  DropdownMenu, Popover, Sheet
} from '@/components/ui';
```

#### 2. Responsive Design Strategy
**Breakpoints:**
- **Mobile**: 320px - 768px (single column, hamburger nav)
- **Tablet**: 768px - 1024px (two column, collapsible sidebar)
- **Desktop**: 1024px+ (full layout with expanded sidebar)

**Layout Patterns:**
- **Mobile**: Stack cards vertically, use tabs for navigation
- **Tablet**: Two-column layout with collapsible sidebar
- **Desktop**: Full sidebar with main content area and optional right panel

#### 3. Accessibility Requirements
- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: WCAG 2.1 AA compliance for all text and UI elements
- **Focus Management**: Clear focus indicators and logical tab order
- **Motion Reduction**: Respect user's motion preferences

### Data Visualization Guidelines

#### 1. Chart Design Principles
**Color Usage:**
- Use consistent color coding across all charts
- Differentiate activity types with distinct colors
- Ensure colorblind-friendly palette
- Use opacity for layered data

**Interaction Patterns:**
- Hover tooltips with detailed information
- Click-to-drill-down functionality
- Brush selection for time ranges
- Zoom and pan for detailed views

#### 2. Chart Types and Use Cases

**Time Allocation (Donut Chart):**
```typescript
const TimeAllocationChart = ({ data }: { data: TimeAllocation[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={60}
        outerRadius={120}
        paddingAngle={2}
        dataKey="duration"
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={getColorByActivityType(entry.type)} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);
```

**Activity Timeline (Bar Chart):**
- Hourly breakdown of activity types
- Interactive selection of time ranges
- Color coding by activity type
- Smooth animations for data updates

### Performance Optimization

#### 1. Data Loading Strategies
- **Lazy Loading**: Load charts only when visible
- **Virtualization**: For large lists of projects or activities
- **Pagination**: For historical data with infinite scroll
- **Caching**: Cache expensive calculations and API calls
- **Debouncing**: Debounce real-time updates to prevent excessive renders

#### 2. Bundle Optimization
```typescript
// Dynamic imports for heavy chart components
const ActivityTimelineChart = dynamic(
  () => import('@/components/charts/ActivityTimelineChart'),
  { 
    ssr: false,
    loading: () => <ChartSkeleton />
  }
);

// Code splitting by route
const AnalyticsPage = dynamic(() => import('@/pages/analytics'));
```

### Testing Strategy

#### 1. Component Testing
```typescript
// Example test for focus session component
describe('FocusSessionManager', () => {
  it('should start a new focus session', async () => {
    render(<FocusSessionManager />);
    
    const startButton = screen.getByText('Start Focus Session');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByText('Active Session')).toBeInTheDocument();
    });
  });
  
  it('should display session timer correctly', () => {
    const mockSession = { 
      id: '1', 
      startTime: new Date(), 
      isActive: true 
    };
    
    render(<FocusSessionManager activeSessions={[mockSession]} />);
    expect(screen.getByText(/00:00/)).toBeInTheDocument();
  });
});
```

#### 2. Integration Testing
- Test data flow from SQLite database to charts
- Verify real-time updates work correctly
- Test responsive behavior across different screen sizes
- Validate accessibility features with screen readers

#### 3. Visual Regression Testing
- Use Percy or Chromatic for visual diff testing
- Test dark/light theme variations
- Verify chart rendering consistency
- Test loading states and error states

### Deliverables for Phase 2

#### Week 3 Deliverables
1. **Next.js application setup** with TypeScript, Tailwind, and component library
2. **Core dashboard layout** with navigation, responsive design, and theme support
3. **Real-time activity monitor** with live updates and session controls
4. **Basic data visualization** components with Recharts integration
5. **Focus session management** interface with start/stop functionality

#### Week 4 Deliverables
1. **Complete project analytics** dashboard with comprehensive metrics
2. **Advanced data visualizations** including timelines, trends, and heatmaps
3. **Settings and preferences** management interface
4. **Mobile-responsive design** optimized for all screen sizes
5. **Performance optimization** and accessibility compliance

### Success Criteria
- ✅ Dashboard loads within 2 seconds on average hardware
- ✅ Real-time updates display within 1 second of activity changes
- ✅ All components are fully responsive across mobile, tablet, and desktop
- ✅ WCAG 2.1 AA accessibility compliance
- ✅ Charts handle datasets of 10,000+ activity events smoothly
- ✅ Focus session controls work reliably with proper state management
- ✅ All interactive elements work with keyboard navigation

### Integration with Phase 1
The dashboard directly integrates with Phase 1 outputs:
- **SQLite Database**: Queries activity logs and projects from Phase 1 database
- **Real-time API**: Connects to Phase 1's activity monitoring service
- **Privacy Settings**: Respects privacy preferences set in desktop app
- **Focus Sessions**: Controls focus mode in the desktop tracker

### Handoff to Phase 3
Phase 2 provides the user interface foundation for Phase 3's integrations:
- **Integration UI**: Settings panels for connecting external services
- **Data Display**: Charts and views that will show integrated data (commits, calendar events)
- **Authentication Flow**: User interface for OAuth connections
- **Dashboard Extension Points**: Modular design for adding new integrated features
- **Real-time Infrastructure**: WebSocket/SSE setup ready for external data streams