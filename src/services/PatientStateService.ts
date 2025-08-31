// PatientStateService.ts
class PatientStateService {
  private static instance: PatientStateService;
  private lastUpdated: { [patientId: string]: number } = {};
  private needsRefresh: boolean = false;

  private constructor() {}

  public static getInstance(): PatientStateService {
    if (!PatientStateService.instance) {
      PatientStateService.instance = new PatientStateService();
    }
    return PatientStateService.instance;
  }

  public markPatientUpdated(patientId: string) {
    this.lastUpdated[patientId] = Date.now();
    this.needsRefresh = true;
  }

  public shouldRefreshList(): boolean {
    return this.needsRefresh;
  }

  public clearRefreshFlag() {
    this.needsRefresh = false;
  }

  public getLastUpdateTime(patientId: string): number {
    return this.lastUpdated[patientId] || 0;
  }
}

export default PatientStateService.getInstance();