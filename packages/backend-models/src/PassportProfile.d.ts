export declare interface Name {
  familyName: string;
  givenName: string;
  middleName?: string;
}

export declare interface Email {
  value: string;
  type?: string;
  verified?: boolean;
}

export declare interface Photo {
  value: string
}

export declare interface PassportProfile {
  provider: string;
  id: string;
  displayName: string;
  name?: Name;
  emails?: Email[];
  photos?: Photo[];
}
