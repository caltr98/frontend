import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import axios from 'axios'; // Make sure axios is installed and imported
import { GlobalVarsService } from '../global-vars.service';
import {ActivatedRoute, Router} from "@angular/router";
import {BackendApiService} from "../backend-api.service";
import {CloudflareStreamService} from "../../lib/services/stream/cloudflare-stream-service";

import {
  Component,
  OnInit,
  ChangeDetectorRef,
  Input,
  EventEmitter,
  Output,
  ViewChild,
} from '@angular/core';
import {
  BackendApiService,
  BackendRoutes,
  PostEntryResponse,
} from '../backend-api.service';
import { Router, ActivatedRoute } from '@angular/router';
import { SharedDialogs } from '../../lib/shared-dialogs';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { EmbedUrlParserService } from '../../lib/services/embed-url-parser-service/embed-url-parser-service';
import { environment } from '../../environments/environment';
import * as tus from 'tus-js-client';
import Timer = NodeJS.Timer;
import { CloudflareStreamService } from '../../lib/services/stream/cloudflare-stream-service';

@Component({
  selector: 'author-holder',
  templateUrl: './author-holder.component.html',
  styleUrls: ['./author-holder.component.sass']
})
export class AuthorHolderComponent implements OnInit {
  jsonDataVCSkills: any = '';
  jsonDataVCStatement: any = '';
  selectedCredentials: number[] = [];
  statementText: string = '';
  opFeedback: string = 'Ready to Request';
  hostURLStatement: string = '';
  categoryStatement: string = '';
  typeStatement: string[] = ['News', 'Article', 'Rumor', 'Comment', 'Opinion', 'Leak', 'Blog', 'Post'];
  selectedTypeStatement: string = this.typeStatement[0];
  listCIDs: string[] = [];
  globalVars: GlobalVarsService;
  GlobalVarsService = GlobalVarsService;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private backendApi: BackendApiService,
    private changeRef: ChangeDetectorRef,
    private appData: GlobalVarsService,
    private streamService: CloudflareStreamService
  ) {
    this.globalVars = appData;
  }
  ngOnInit(): void {}

  handleCheckboxChange(event: any, index: number): void {
    if (event.target.checked) {
      this.selectedCredentials.push(index);
    } else {
      this.selectedCredentials = this.selectedCredentials.filter(item => item !== index);
    }
  }

  async sendToCavs(): Promise<void> {
    if (this.selectedCredentials.length === 0) {
      this.opFeedback = 'Please select VCs';
      return;
    }

    this.opFeedback = 'Processing creation of Statement VC';

    try {
      const response = await axios.post(
        `${this.GlobalVarsService.addressCAVS}/api/vc`,
        {
          document: this.statementText,
          credentials: this.selectedCredentials.map(index => this.jsonDataVCSkills[index].verifiableCredential),
          typeStatement: this.selectedTypeStatement,
          category: this.categoryStatement,
          hostURL: this.hostURLStatement,
          holderDID: this.GlobalVarsService.selectedDid // Make sure selectedDid is defined or passed from parent
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 195000 // 3 minutes timeout
        }
      );

      this.opFeedback = `Got VC Statement, storing in wallet of ${this.GlobalVarsService.selectedDid}`; // Update with actual variable
      await axios.post(`${this.GlobalVarsService.addressVeramoAgent}/store_vc`, {
        verifiableCredential: response.data.jwt,
        did: this.GlobalVarsService.selectedDid // Update with actual variable
      });

      this.statementText = '';
      this.categoryStatement = '';
      this.hostURLStatement = '';
      this.opFeedback = 'Done';
    } catch (error) {
      console.error('Error obtaining credentials:', error);
    }
  }

  async fetchCredentials(): Promise<void> {
    try {
      const response = await axios.get(`${this.GlobalVarsService.addressVeramoAgent}/list_verifiable_credentials_with_type`, {
        timeout: 65000,
        params: {
          type: 'ESCO_type_VerifiableCredential'
        }
      });

      this.jsonDataVCSkills = response.data;
    } catch (error) {
      console.error('Error fetching credentials:', error);
    }
  }

  async fetchStatementCredentials(): Promise<void> {
    try {
      const response = await axios.get(`${this.GlobalVarsService.addressVeramoAgent}/list_verifiable_credentials_with_type`, {
        timeout: 65000,
        params: {
          type: 'StatementVerifiableCredential'
        }
      });

      this.jsonDataVCStatement = response.data;
    } catch (error) {
      console.error('Error fetching credentials:', error);
    }
  }

  async ipfsPublish(id: number): Promise<void> {
    try {
      const response = await axios.post(
        `${this.GlobalVarsService.addressIPFSAgent}/upload`,
        {
          text: this.jsonDataVCStatement[id].verifiableCredential.proof.jwt
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 65000
        }
      );

      const updatedListCIDs = [...this.listCIDs];
      updatedListCIDs[id] = response.data.CID;
      this.listCIDs = updatedListCIDs;
    } catch (error) {
      console.error('Error publishing on IPFS or fetching:', error);
    }
  }
}
