export class AppConfig {
  private static instance: AppConfig;
  private dashboardPort: number = 3000; // Default port
  private isDetecting: boolean = false;
  
  private constructor() {
    // Don't call async method in constructor
    // Will be called when needed
  }
  
  static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }
  
  private async detectDashboardPort(): Promise<void> {
    if (this.isDetecting) return; // Prevent multiple concurrent detections
    this.isDetecting = true;
    
    // Try common Next.js ports in order - start with 3000 first since that's our dashboard
    const commonPorts = [3000, 3001, 3002, 3003, 3004, 3005];
    
    for (const port of commonPorts) {
      try {
        // Check if port is responding with DevPulse dashboard
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        
        const response = await fetch(`http://localhost:${port}/api/activity`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        if (response.ok) {
          this.dashboardPort = port;
          console.log(`📊 DevPulse dashboard detected on port ${port}`);
          this.isDetecting = false;
          return;
        }
      } catch (error) {
        // Port is not responding, try next
        continue;
      }
    }
    
    console.log(`⚠️ Dashboard not detected, using default port ${this.dashboardPort}`);
    this.isDetecting = false;
  }
  
  async getDashboardUrl(): Promise<string> {
    if (!this.isDetecting) {
      await this.detectDashboardPort();
    }
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