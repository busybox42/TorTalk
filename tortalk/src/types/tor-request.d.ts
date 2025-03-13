declare module 'tor-request' {
  function torRequest(url: string, options?: any, callback?: (err: any, res: any, body: any) => void): any;
  
  namespace torRequest {
    function setTorAddress(host: string, port: number): void;
    function newTorSession(callback?: (err: any) => void): void;
  }
  
  export = torRequest;
} 