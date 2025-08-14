export class AppConfig {
  private static instance: AppConfig;
  private dashboardPort: number = 3001; // Default port
  
  private constructor() {
    this.detectDashboardPort();
  }
  
  static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }
  
  private async detectDashboardPort(): Promise<void> {
    // Try common Next.js ports in order
    const commonPorts = [3001, 3000, 3002, 3003, 3004, 3005];
    
    for (const port of commonPorts) {
      try {
        // Check if port is responding with DevPulse dashboard
        const response = await fetch(`http://localhost:${port}/api/activity`);
        if (response.ok) {
          this.dashboardPort = port;
          console.log(`📊 DevPulse dashboard detected on port ${port}`);
          return;
        }
      } catch (error) {
        // Port is not responding, try next
        continue;
      }
    }
    
    console.log(`⚠️ Dashboard not detected, using default port ${this.dashboardPort}`);
  }
  
  getDashboardUrl(): string {
    return `http://localhost:${this.dashboardPort}`;
  }
  
  getDashboardPort(): number {
    return this.dashboardPort;
  }
  
  // Refresh detection (can be called periodically)
  async refreshDashboardPort(): Promise<void> {
    await this.detectDashboardPort();
  }
}