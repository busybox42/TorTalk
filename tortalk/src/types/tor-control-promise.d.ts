declare module 'tor-control-promise' {
  class TorControl {
    constructor(options?: {
      host?: string;
      port?: number;
      password?: string;
    });
    
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    authenticate(password: string): Promise<void>;
    signalNewnym(): Promise<void>;
    getInfo(key: string): Promise<string>;
  }
  
  export = TorControl;
} 