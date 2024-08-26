import {
  Component,
  OnInit,
  ChangeDetectorRef,
  Input,
  EventEmitter,
  Output,
  ViewChild,
} from '@angular/core';
import { GlobalVarsService } from '../../global-vars.service';
import {
  BackendApiService,
  BackendRoutes,
  PostEntryResponse,
} from '../../backend-api.service';
import { Router, ActivatedRoute } from '@angular/router';
import { SharedDialogs } from '../../../lib/shared-dialogs';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { EmbedUrlParserService } from '../../../lib/services/embed-url-parser-service/embed-url-parser-service';
import { environment } from '../../../environments/environment';
import * as tus from 'tus-js-client';
import Timer = NodeJS.Timer;
import { CloudflareStreamService } from '../../../lib/services/stream/cloudflare-stream-service';
import {Observable} from "rxjs";

@Component({
  selector: 'feed-create-post',
  templateUrl: './feed-create-post.component.html',
  styleUrls: ['./feed-create-post.component.sass'],
})
export class FeedCreatePostComponent implements OnInit {
  jsonDataVCSkills: any[] = [];
  selectedCredentials: number[] = [];
  private statusMessage: string;
  private currentVC: string;
  private lastCid: string;
  private lastDiffusionVP:string;


  // New variables for the VC Diffusion
  private urlVPDiffusion: string;
  private cidVPDiffusion: string;
  private jwtVPDiffusion: string;
  private uuidVPDiffusion: string;

  handleCheckboxChange(event: Event, index: number): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedCredentials.push(index);
    } else {
      const idx = this.selectedCredentials.indexOf(index);
      if (idx > -1) {
        this.selectedCredentials.splice(idx, 1);
      }
    }
  }

  getArraySelectedCredentials(): any[] {
    const selectedElements = this.selectedCredentials.map(i => this.jsonDataVCSkills[i].verifiableCredential);
    return selectedElements;
  }






  static SHOW_POST_LENGTH_WARNING_THRESHOLD = 515; // show warning at 515 characters

  EmbedUrlParserService = EmbedUrlParserService;

  @Input() postRefreshFunc: any = null;
  @Input() numberOfRowsInTextArea: number = 2;
  @Input() parentPost: PostEntryResponse = null;
  @Input() isQuote: boolean = false;
  @Input() inTutorial: boolean = false;

  isComment: boolean;

  @ViewChild('autosize') autosize: CdkTextareaAutosize;

  randomMovieQuote = '';
  randomMovieQuotes = [
    'Go ahead, make my day.',
    'The stuff that dreams are made of.',
    'Made it, Ma! Top of the world!',
    "I'll be back.",
    'Open the pod bay doors, HAL.',
    "Who's on first.",
    "What's on second.",
    'I feel the need - the need for speed!',
    "I'm king of the world!",
    'If you build it, they will come.',
    "Roads? Where we're going we don't need roads",
    'To infinity and beyond!',
    'May the Force be with you',
    "I've got a feeling we're not in Kansas anymore",
    'E.T. phone home',
    'Elementary, my dear Watson',
    "I'm going to make him an offer he can't refuse.",
    'Big things have small beginnings.',
  ];

  submittingPost = false;
  postInput = '';
  ethPrivateKey:string='';
  postImageSrc = null;

  postVideoSrc = null;
  assetId = '';
  videoUploadPercentage = null;

  showEmbedURL = false;
  showImageLink = false;
  showVCSkillList = false;
  embedURL = '';
  constructedEmbedURL: any;
  videoStreamInterval: Timer = null;
  readyToStream: boolean = false;

  cidVCOfDiffusion:string
  // Emits a PostEntryResponse. It would be better if this were typed.
  @Output() postCreated = new EventEmitter();

  //post adding to input the url of the previous diffusion VP host
  _postVPDiffusionDiffusion(prevUrl:string) {
    this.postInput = this.urlVPDiffusion
    this._publishVPDiffusionToIPFS("Diffusion");
  }


  _createVPDiffusionDiffusion() {
    this.statusMessage = 'Creating VP Diffusion of type diffusion...';
    console.log("Creating VP Diffusion of type diffusion...");
    //necessary to publish the jwt of the previous Diffusion VP, to retrieve it in the trace back
    this.backendApi.IPFSPublish(this.globalVars.addressIPFSAgent,this.jwtVPDiffusion).subscribe( (res: any) => {

      console.log("Published JWT of previous VP Diffusion: ", res.CID);
      this.backendApi.createVP(
        this.globalVars.addressVeramoAgent,
        this.globalVars.selectedDid,
        this.cidVCOfDiffusion,
        this.uuidVPDiffusion,
        res.CID,
        "diffusion",
        "https://node.deso.org/u/" + this.globalVars.loggedInUser.ProfileEntryResponse.Username
      ).subscribe(
        (res: any) => {
          console.log("Created VP Diffusion of type diffusion response: ", res);

          this.lastDiffusionVP = res.jwt;
          this._postVPDiffusionDiffusion(this.urlVPDiffusion)



        },
        (err) => {
          console.error('Error creating VP Diffusion:', err);
          this.statusMessage = 'Error creating VP Diffusion.';
        }
      );


    })
  }

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

  ngOnInit() {
    this.isComment = !this.isQuote && !!this.parentPost;
    this._setRandomMovieQuote();
    if (this.inTutorial) {
      this.postInput = "It's time to DESO!";
    }
  }

  onPaste(event: any): void {
    const items = (event.clipboardData || event.originalEvent.clipboardData)
      .items;
    let blob = null;

    for (const item of items) {
      if (item.type.indexOf('image') === 0) {
        blob = item.getAsFile();
      }
    }

    if (blob) {
      this._handleFileInput(blob);
    }
  }

  uploadFile(event: any): void {
    this._handleFileInput(event[0]);
  }

  showCharacterCountIsFine() {
    return (
      this.postInput.length <
      FeedCreatePostComponent.SHOW_POST_LENGTH_WARNING_THRESHOLD
    );
  }

  showCharacterCountWarning() {
    return (
      this.postInput.length >=
        FeedCreatePostComponent.SHOW_POST_LENGTH_WARNING_THRESHOLD &&
      this.postInput.length <= GlobalVarsService.MAX_POST_LENGTH
    );
  }

  characterCountExceedsMaxLength() {
    return this.postInput.length > GlobalVarsService.MAX_POST_LENGTH;
  }

  getPlaceholderText() {
    // Creating vanilla post
    if (!this.parentPost) {
      return this.randomMovieQuote;
    }
    // Creating comment or quote repost;
    return this.isQuote ? 'Add a quote' : 'Post your reply';
  }

  _setRandomMovieQuote() {
    const randomInt = Math.floor(Math.random() * this.randomMovieQuotes.length);
    this.randomMovieQuote = this.randomMovieQuotes[randomInt];
  }

  setEmbedURL() {
    EmbedUrlParserService.getEmbedURL(
      this.backendApi,
      this.globalVars,
      this.embedURL
    ).subscribe((res) => (this.constructedEmbedURL = res));
  }

  submitPost() {
    if (this.postInput.length > GlobalVarsService.MAX_POST_LENGTH) {
      return;
    }

    // post can't be blank
    if (
      this.postInput.length === 0 &&
      !this.postImageSrc &&
      !this.postVideoSrc
    ) {
      return;
    }

    if (this.submittingPost) {
      return;
    }

    const postExtraData = {};
    if (this.embedURL) {
      if (EmbedUrlParserService.isValidEmbedURL(this.constructedEmbedURL)) {
        postExtraData['EmbedVideoURL'] = this.constructedEmbedURL;
      }
    }

    if (environment.node.id) {
      postExtraData['Node'] = environment.node.id.toString();
    }

    const bodyObj = {
      Body: this.postInput,
      ImageURLs: [this.postImageSrc].filter((n) => n),
      VideoURLs: [this.postVideoSrc].filter((n) => n),
    };
    const repostedPostHashHex = this.isQuote ? this.parentPost.PostHashHex : '';
    this.submittingPost = true;
    const postType = this.isQuote
      ? 'quote'
      : this.isComment
      ? 'reply'
      : 'create';

    this.backendApi
      .SubmitPost(
        this.globalVars.localNode,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        '' /*PostHashHexToModify*/,
        this.isComment ? this.parentPost.PostHashHex : '' /*ParentPostHashHex*/,
        '' /*Title*/,
        bodyObj /*BodyObj*/,
        repostedPostHashHex,
        postExtraData,
        '' /*Sub*/,
        // TODO: Should we have different values for creator basis points and stake multiple?
        // TODO: Also, it may not be reasonable to allow stake multiple to be set in the FE.
        false /*IsHidden*/,
        this.globalVars.defaultFeeRateNanosPerKB /*MinFeeRateNanosPerKB*/,
        this.inTutorial
      )
      .subscribe(
        (response) => {

          console.log("return of post-> "+JSON.stringify(response))
          this.globalVars.logEvent(`post : ${postType}`);

          this.submittingPost = false;

          this.postInput = '';
          this.postImageSrc = null;
          this.postVideoSrc = null;
          this.embedURL = '';
          this.constructedEmbedURL = '';
          this.showEmbedURL = false;
          this.changeRef.detectChanges();

          // Refresh the post page.
          if (this.postRefreshFunc) {
            this.postRefreshFunc(response.PostEntryResponse);
          }

          this.postCreated.emit(response.PostEntryResponse);
        },
        (err) => {
          const parsedError = this.backendApi.parsePostError(err);
          this.globalVars._alertError(parsedError);
          this.globalVars.logEvent(`post : ${postType} : error`, {
            parsedError,
          });

          this.submittingPost = false;
          this.changeRef.detectChanges();
        }
      );
  }

  _createPost() {
    // Check if the user has an account.
    if (!this.globalVars?.loggedInUser) {
      this.globalVars.logEvent('alert : post : account');
      SharedDialogs.showCreateAccountToPostDialog(this.globalVars);
      return;
    }

    // Check if the user has a profile.
    if (!this.globalVars?.doesLoggedInUserHaveProfile()) {
      this.globalVars.logEvent('alert : post : profile');
      SharedDialogs.showCreateProfileToPostDialog(this.router);
      return;
    }

    // The user has an account and a profile. Let's create a post.
    this.submitPost();
  }



  _fetchSkillVC(){
    console.log("here")
    this.backendApi
      .GetUserVCSkill(
        this.globalVars.addressVeramoAgent
      )
      .subscribe(
        (res: any) => {
          console.log("response is-> "+JSON.stringify(res));
          if(res.data !=''){
            console.log()
           this.jsonDataVCSkills = res;
          }
        },
        (err) => {
          console.error('Error fetching VC skills:', err);
        }
      );
  }


  _sendToCAVS() {
    console.log("Starting _sendToCAVS process...");
    console.log("Selected Credentials: ", this.getArraySelectedCredentials());

    this.statusMessage = 'Processing statement by CAVS...';

    this.backendApi.sendToCAVS(
      this.globalVars.addressCAVS,
      this.getArraySelectedCredentials(),
      "https://node.deso.org/u/" + this.globalVars.loggedInUser.ProfileEntryResponse.Username,
      this.postInput,
      this.globalVars.selectedDid
    ).subscribe(
      (res: any) => {

        console.log("CAVS response: ", res.jwt);
        this.currentVC = res.jwt;
        this._storeVCStatement();
      },
      (err) => {
        console.error('Error fetching VC skills:', err);
        this.statusMessage = 'Error processing statement by CAVS.';
      }
    );
  }

  _storeVCStatement() {
    this.statusMessage = 'Storing VC Statement...';
    console.log("Storing VC Statement...");

    this.backendApi.storeVCVeramoAgent(
      this.globalVars.addressVeramoAgent,
      this.currentVC,
      this.globalVars.selectedDid
    ).subscribe(
      (res: any) => {
        console.log("Store VC response: ", res);
        this._publishVCToIPFS();
      },
      (err) => {
        console.error('Error storing VC Statement:', err);
        this.statusMessage = 'Error storing VC Statement.';
      }
    );
  }

  _publishVCToIPFS() {
    this.statusMessage = 'Publishing VC Statement to IPFS...';
    console.log("Publishing VC Statement to IPFS...");

    this.backendApi.IPFSPublish(
      this.globalVars.addressIPFSAgent,
      this.currentVC
    ).subscribe(
      (res: any) => {
        console.log("IPFS publish VC response: ", res);
        console.log("cid="+res.CID)
        this.lastCid = res.CID;
        this._createVPDiffusionOrigin();
      },
      (err) => {
        console.error('Error publishing VC to IPFS:', err);
        this.statusMessage = 'Error publishing VC to IPFS.';
      }
    );
  }

  _createVPDiffusionOrigin() {
    this.statusMessage = 'Creating VP Diffusion of type origin...';
    console.log("Creating VP Diffusion of type origin...");

    this.backendApi.createVP(
      this.globalVars.addressVeramoAgent,
      this.globalVars.selectedDid,
      this.lastCid,
      "",
      "",
      "origin",
      "https://node.deso.org/u/" + this.globalVars.loggedInUser.ProfileEntryResponse.Username
    ).subscribe(
      (res: any) => {
        console.log("Create VP Diffusion response: ", res);
        this.lastDiffusionVP = res.jwt;
        this._publishVPDiffusionToIPFS("Origin");
      },
      (err) => {
        console.error('Error creating VP Diffusion:', err);
        this.statusMessage = 'Error creating VP Diffusion.';
      }
    );
  }

  _publishVPDiffusionToIPFS(type: string) {
    this.statusMessage = 'Publishing VP Diffusion of type Origin to IPFS...';
    console.log("Publishing VP Diffusion to IPFS..."+ this.lastDiffusionVP);

    this.backendApi.IPFSPublish(
      this.globalVars.addressIPFSAgent,
      this.lastDiffusionVP
    ).subscribe(
      (res: any) => {
        console.log("IPFS publish VP Diffusion response: ", res);
        this.lastCid = res.CID;
        this._createPostWithVP(type);
      },
      (err) => {
        console.error('Error publishing VP Diffusion to IPFS:', err);
        this.statusMessage = 'Error publishing VP Diffusion to IPFS.';
      }
    );
  }

  _createPostWithVP(type: string) {
    this.statusMessage = 'Creating post...';
    console.log("Creating post...");

    this.postInput += "\n\n-VPDiffusion"+type+"-CID:" + this.lastCid;
    this._createPost();
  }


    // CALTR98: Addition of special behaviour for VC skills
  _additionSkillVC() {
    this.showVCSkillList = true;
    //this.submitPost();
  }
  // CALTR98: Addition of special behaviour for VC skills
  _addDID() {
    console.log("here")
    this.backendApi
      .setupVeramoToVeramoAgent(
        this.globalVars.addressVeramoAgent, this.ethPrivateKey,
        this.globalVars.userETHRAddr
      )
      .subscribe(
        (res: any) => {
          console.log(res);
          this.globalVars.isSetupDID = true;
          console.log("setup done")
        },
        (err) => {
          console.error('Error fetching Ethereum address:', err);
        }
      );
  }



    _handleFilesInput(files: FileList): void {
    this.showImageLink = false;
    const fileToUpload = files.item(0);
    this._handleFileInput(fileToUpload);
  }

  _handleFileInput(file: File): void {
    if (!file) {
      return;
    }

    if (
      !file.type ||
      (!file.type.startsWith('image/') && !file.type.startsWith('video/'))
    ) {
      this.globalVars._alertError(
        'File selected does not have an image or video file type.'
      );
    } else if (file.type.startsWith('video/')) {
      this.uploadVideo(file);
    } else if (file.type.startsWith('image/')) {
      this.uploadImage(file);
    }
  }

  uploadImage(file: File) {
    if (file.size > 15 * (1024 * 1024)) {
      this.globalVars._alertError(
        'File is too large. Please choose a file less than 15MB'
      );
      return;
    }
    return this.backendApi
      .UploadImage(
        environment.uploadImageHostname,
        this.globalVars.loggedInUser.PublicKeyBase58Check,
        file
      )
      .subscribe(
        (res) => {
          this.postImageSrc = res.ImageURL;
          this.postVideoSrc = null;
        },
        (err) => {
          this.globalVars._alertError(JSON.stringify(err.error.error));
        }
      );
  }



  async uploadVideo(file: File): Promise<void> {
    if (file.size > 65 * 1024 * 1024) {
      this.globalVars._alertError(
        'File is too large. Please choose a file less than 65MB'
      );
      return;
    }
    // Set this so that the video upload progress bar shows up.
    this.postVideoSrc = 'https://lvpr.tv';
    let tusEndpoint, asset;
    try {
      ({ tusEndpoint, asset } = await this.backendApi
        .UploadVideo(
          environment.uploadVideoHostname,
          file,
          this.globalVars.loggedInUser.PublicKeyBase58Check
        )
        .toPromise());
    } catch (e) {
      this.postVideoSrc = '';
      this.globalVars._alertError(JSON.stringify(e.error.error));
      return;
    }

    this.postVideoSrc = `https://lvpr.tv/?v=${asset.playbackId}`;
    this.assetId = asset.id;
    this.postImageSrc = '';
    this.videoUploadPercentage = null;

    this.pollForReadyToStream();
  }

  pollForReadyToStream(): void {
    let attempts = 0;
    let numTries = 1200;
    let timeoutMillis = 500;
    this.videoStreamInterval = setInterval(() => {
      if (attempts >= numTries) {
        clearInterval(this.videoStreamInterval);
        return;
      }
      this.streamService
        .checkVideoStatusByURL(this.assetId)
        .then(([readyToStream, exitPolling, failed]) => {
          if (readyToStream) {
            this.readyToStream = true;
            clearInterval(this.videoStreamInterval);
            return;
          }
          if (failed) {
            clearInterval(this.videoStreamInterval);
            this.postVideoSrc = '';
            this.globalVars._alertError(
              'Video failed to upload. Please try again.'
            );
          }
          if (exitPolling) {
            clearInterval(this.videoStreamInterval);
            return;
          }
        });
      attempts++;
    }, timeoutMillis);
  }




}
