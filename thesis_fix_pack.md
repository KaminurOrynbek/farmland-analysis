# Thesis Fix Pack

This file is a practical rewrite pack for the diploma report based on:

- the current PDF draft,
- the actual project code in this repository,
- the saved ML artifacts and training notebook results.

Use it as follows:

1. Apply the report-wide corrections in Section 1.
2. Use the corrected chapter order in Section 2.
3. Paste or adapt the replacement text from Section 4 onward into your thesis document.

## 1. Report-wide corrections to apply everywhere

- Use one consistent system name everywhere. I recommend `Farmland Analysis System`.
- Replace `Mapbox GL JS` with `Leaflet.js` or `React Leaflet`.
- Remove `Tailwind CSS` from the technology stack unless you actually added it later. The current frontend uses custom CSS with React and Vite.
- If you mention the React version, use `React` generically or `React 19`. Do not keep `React 18` unless you later downgrade the frontend.
- Treat `Sentinel-2 via Google Earth Engine` as the core implemented operational satellite pipeline.
- Treat `Landsat 8/9` and `Sentinel Hub` as optional extensions or comparative alternatives, not as the main implemented pipeline.
- Replace claims about `crop type classification` with `land-cover class prediction` when referring to the ResNet-50 model trained on EuroSAT. EuroSAT classes include `AnnualCrop`, `Forest`, `PermanentCrop`, `SeaLake`, etc., so the model is not a direct crop-health or exact crop-species classifier.
- Remove statements that the system predicts specific crops such as `Winter Wheat` unless you have a different model for that.
- Separate two kinds of results clearly:
  - benchmark ML results on EuroSAT,
  - prototype system implementation results for the web platform.
- Remove or rewrite claims that are not implemented in the current system, including:
  - organization SSO,
  - TLS 1.3 UI indicator,
  - biomass in t/ha,
  - chlorophyll concentration estimation,
  - GeoTIFF/PDF export if not implemented,
  - fully live NDVI heatmap overlays if they are still placeholder/demo states in the UI.
- Fix the figure and table references. Several current references point to the wrong chapter numbers.
- Fix bibliography consistency. The current draft cites `[19]-[24]`, but the extracted bibliography only contains `[1]-[18]`. Either add the missing references or renumber/remove those citations.
- Add the missing conclusion chapter.

## 2. Recommended corrected structure from Chapter 5 onward

Use this structure to avoid the current chapter and heading conflicts:

- 5. Methodology
- 6. MVP, UML Diagrams, and Project Architecture
- 7. Results and Evaluation
- 8. Technology Comparison and Selection Rationale
- 9. Mockups of the Project
- 10. Conclusion
- Bibliography

## 3. Targeted edits for Chapters 3 and 4

These chapters are mostly usable, but the following corrections are important:

- In Chapter 3, do not keep citations `[19]-[24]` unless the corresponding bibliography entries are added.
- In Chapter 4, describe `Sentinel-2 through Google Earth Engine` as the actual implemented operational source.
- In Chapter 4, describe `Landsat 8/9` and `Sentinel Hub` as planned or comparative extensions unless you truly integrated them in the backend pipeline.
- In Chapter 4.5, state that NDVI and EVI are computed from raster bands by the raster-processing module, not by a generic placeholder service.
- In Chapter 4.8, rename the summary table to `Table 4.1` and keep chapter-specific numbering consistent.

## 4. Paste-ready replacement text

## 5. Methodology

### 5.1 Research Approach and Paradigm

This study adopts an applied research approach focused on the design, implementation, and evaluation of a prototype web platform for farmland analysis. The work combines remote sensing, geospatial data processing, transfer learning, and web software engineering in order to create an end-to-end analytical system rather than a purely theoretical model. The central research task is therefore not the invention of a new neural-network architecture, but the integration of existing and well-established methods into a practical tool for agricultural monitoring.

The methodological logic of the project is interdisciplinary. From the geospatial side, the system uses vector field boundaries and satellite imagery as the basis for field-level analysis. From the machine-learning side, it applies a fine-tuned convolutional neural network to classify satellite image content. From the software-engineering side, it provides a web interface, database storage, background task processing, and role-based access to analytical results. This combination reflects the practical nature of modern digital agriculture, where value is created not only by predictive accuracy but also by the accessibility, reproducibility, and operational usefulness of the complete system.

Three methodological principles guide the work:

- Reproducibility. The project uses a documented training notebook, saved model weights, structured API endpoints, and persistent storage of analysis outputs.
- Modularity. The system separates frontend interaction, backend orchestration, geospatial processing, and machine-learning inference into distinct components.
- Extensibility. The prototype is designed so that additional satellite sources, new trained models, or more advanced raster products can be integrated later without redesigning the whole platform.

The study therefore evaluates both the analytical component and the implemented web system. The machine-learning component is evaluated on the EuroSAT benchmark dataset, while the platform component is evaluated through its implemented workflow for field registration, analysis triggering, background execution, and result presentation.

### 5.2 System Architecture

The Farmland Analysis System follows a modular multi-component architecture consisting of a frontend layer, a backend application layer, a data and storage layer, and a machine-learning inference layer. The overall purpose of this structure is to keep user interaction, business logic, asynchronous processing, and analytical computation clearly separated.

#### 5.2.1 Frontend Layer

The frontend is implemented as a single-page web application using React and Vite. Interactive map visualization is built with Leaflet.js through the React Leaflet library, while polygon drawing and editing are supported through Leaflet-Geoman. The frontend provides the main user-facing workflows of the system, including authentication, field selection, field drawing or upload, workspace visualization, analysis history browsing, and review of analytical results.

The main user interface is organized around several screens:

- an authentication page for sign-in and registration,
- a home/dashboard view,
- a workspace page for field interaction and analysis launching,
- an analysis details page for reviewing the stored outputs of completed runs,
- additional supporting views for project history, team access, profile data, and administration.

The frontend communicates with the backend through REST API calls and also supports real-time progress updates through WebSocket connections for long-running analysis jobs.

#### 5.2.2 Backend Application Layer

The backend is implemented in Python using FastAPI. It serves as the central orchestration layer of the system and exposes REST endpoints for authentication, field management, geospatial data handling, analysis execution, analysis status tracking, history retrieval, comments, and administration.

The backend applies a layered design. User requests are received through API routers, validated with request schemas, and forwarded to service and repository layers. Business logic such as field creation, permission checking, analysis dispatching, and result persistence is separated from lower-level infrastructure concerns such as database access, object storage, and Earth Engine communication.

Authentication is based on JWT tokens. Role and permission logic is also implemented at the backend level. In addition to global user roles, the system supports field-specific access levels such as OWNER, EDITOR, and VIEWER.

#### 5.2.3 Background Processing and Storage Layer

The system uses asynchronous background execution for the main analysis workflow. When a user starts an analysis, the backend creates an analysis record and dispatches the task through Celery. Redis is used for message brokering, progress caching, and real-time notification support. This design prevents long-running analytical jobs from blocking the main API thread and makes the system more suitable for practical use.

For file and artifact storage, the project uses S3-compatible object storage through MinIO. Raw imagery downloaded from Google Earth Engine can be persisted as input artifacts, while processed outputs and metadata can be stored separately from the relational database. This approach supports traceability and simplifies the management of larger binary files.

Relational data are stored in PostgreSQL with PostGIS support. Field boundaries are therefore stored as real spatial geometries rather than only as plain JSON documents, which enables consistent handling of field polygons and associated metadata.

#### 5.2.4 Machine-Learning Inference Layer

The machine-learning component is implemented in PyTorch and integrated into the backend through a dedicated adapter. The deployed model is a ResNet-50 network fine-tuned on the EuroSAT dataset and saved as a reusable weight file. During inference, the adapter loads the trained model, reads raster input, converts the raster into an RGB-like representation suitable for the network input, and applies preprocessing consistent with the training pipeline.

For larger imagery, the adapter performs patch-based inference and aggregates patch-level predictions through majority voting. This makes the deployed model more practical for real field imagery than a strictly single-tile approach.

#### 5.2.5 System Interaction Pattern

The implemented user-to-system workflow can be summarized as follows:

1. The user signs in and selects or creates a field boundary.
2. The field geometry is validated, area metadata are computed, and the field is stored in PostGIS.
3. The user starts an analysis through the workspace interface.
4. The backend creates an analysis job and dispatches it to a Celery worker.
5. The worker retrieves Sentinel-2 imagery through Google Earth Engine, stores raw imagery in object storage, computes spectral indices, runs ML inference, generates an agronomic summary, and stores the results.
6. Progress updates are exposed through REST status polling and WebSocket notifications.
7. Completed results are presented in the frontend and stored in analysis history for later review.

### 5.3 Data Processing Workflow

The implemented analytical workflow consists of six sequential stages.

#### Stage 1. Field Boundary Ingestion and Validation

The workflow begins with user-provided field geometry. Field polygons are submitted through the frontend either from uploaded GeoJSON data or from manually drawn boundaries. On the backend, the geometry is validated and transformed into a structured geospatial object. Area and bounding metadata are calculated and the final geometry is stored in PostgreSQL/PostGIS.

This stage is necessary because all later analysis depends on having a reliable field extent that defines the region of interest for satellite-image retrieval and raster statistics.

#### Stage 2. Satellite Imagery Retrieval

After the field has been stored, the analysis worker requests remote-sensing imagery from Google Earth Engine. In the current implementation, the operational source is the Sentinel-2 Harmonized surface-reflectance collection. The request is filtered by field geometry, date range, and cloud-cover threshold. A median composite is produced for the selected period and prepared for download.

The use of Google Earth Engine is important because it avoids maintaining a local archive of large satellite scenes and makes cloud-based access to historical and recent imagery possible within a compact prototype.

#### Stage 3. Raw Data Persistence

Once the remote image has been prepared, it is downloaded as a GeoTIFF and stored in S3-compatible object storage. This step improves reproducibility because the system can preserve the exact raw input associated with an analysis job rather than only storing the final derived metrics.

#### Stage 4. Spectral Index Computation

The stored raster is processed with the raster-analysis module. In the current implementation, the system computes at least NDVI and, where the required bands are available, EVI. The calculations use reflectance-scaled raster values and derive summary statistics such as mean NDVI, mean EVI, minimum NDVI, maximum NDVI, and the proportion of low-NDVI stress pixels.

This stage adds interpretable vegetation indicators that complement the machine-learning model and support a more transparent explanation of field condition.

#### Stage 5. Machine-Learning Inference

The machine-learning adapter loads the fine-tuned ResNet-50 model and applies the same image normalization strategy used during training. For small images the system performs direct prediction; for larger raster inputs it uses patch-based prediction and aggregates the patch outputs. The model returns the predicted EuroSAT land-cover class together with a confidence score.

At this point it is important to emphasize that the model predicts one of the EuroSAT classes, such as AnnualCrop, PermanentCrop, Forest, or Residential. Therefore, the model output should be interpreted as land-cover classification rather than exact crop-health diagnosis.

#### Stage 6. Agronomic Interpretation and Result Storage

After spectral indices and ML predictions are available, the system generates a higher-level agronomic summary. The current implementation combines NDVI-based vegetation interpretation, stress-area estimation, the model prediction, and simple rule-based recommendations into a structured result object. The outputs are stored in the database and linked to the originating analysis record so they can be accessed later through the history and details pages.

### 5.4 Machine-Learning Model

#### 5.4.1 Model Selection

The machine-learning component of the project is based on ResNet-50. This architecture was selected because it provides strong representational capacity while remaining widely used, well documented, and practical for transfer-learning workflows. The residual structure of the model enables deep feature extraction without the optimization problems that affect simpler deep convolutional stacks.

The selection is also appropriate for this project because the goal is not to create a novel architecture from scratch, but to adapt a reliable pretrained backbone to a land-cover classification task that is relevant to agricultural monitoring.

#### 5.4.2 Transfer-Learning Strategy

The model-training notebook initializes ResNet-50 with pretrained ImageNet weights and replaces the final fully connected classification layer with a 10-class output layer corresponding to the EuroSAT label space. The final classes are:

- AnnualCrop
- Forest
- HerbaceousVegetation
- Highway
- Industrial
- Pasture
- PermanentCrop
- Residential
- River
- SeaLake

The training approach is full fine-tuning rather than frozen-feature extraction. This means that the pretrained convolutional backbone is adapted to the characteristics of the target satellite imagery rather than using only the final layer as a trainable component.

#### 5.4.3 Data Preparation

The training data are based on the EuroSAT dataset. Input images are resized to 224 x 224 pixels to match ResNet-50 input requirements. The training split uses data augmentation with random horizontal flipping and random rotation, while validation and test splits use deterministic preprocessing. All splits apply ImageNet normalization statistics.

The dataset is partitioned using stratified splitting with an 80:10:10 ratio for training, validation, and test subsets respectively. The random seed is fixed for reproducibility.

#### 5.4.4 Training Configuration

The model was trained in a Kaggle GPU environment using an NVIDIA Tesla T4 accelerator. The optimizer was Adam with a learning rate of 0.0001. Cross-entropy loss was used for multi-class classification, and the batch size was 32.

**Table 5.1. Training configuration**

| Parameter | Value |
| --- | --- |
| Base architecture | ResNet-50 |
| Initialization | Pretrained ImageNet weights |
| Target classes | 10 EuroSAT classes |
| Image size | 224 x 224 |
| Batch size | 32 |
| Optimizer | Adam |
| Learning rate | 0.0001 |
| Loss function | Cross-entropy |
| Train set size | 21,600 |
| Validation set size | 2,700 |
| Test set size | 2,700 |
| Compute environment | Kaggle, NVIDIA Tesla T4 |

#### 5.4.5 Training Results

The training notebook shows stable convergence over five epochs and strong validation performance.

**Table 5.2. Training history**

| Epoch | Train Loss | Train Accuracy | Validation Loss | Validation Accuracy |
| --- | --- | --- | --- | --- |
| 1 | 0.2947 | 91.29% | 0.0706 | 97.63% |
| 2 | 0.1006 | 96.76% | 0.0513 | 98.52% |
| 3 | 0.0701 | 97.62% | 0.0465 | 98.93% |
| 4 | 0.0541 | 98.10% | 0.0449 | 98.48% |
| 5 | 0.0450 | 98.49% | 0.0448 | 98.48% |

The best checkpoint was saved at Epoch 3 with a validation accuracy of 98.93%. This checkpoint was later exported as the reusable model-weight file for backend inference.

#### 5.4.6 Held-out Test Evaluation

The saved notebook also includes explicit test-set evaluation on the held-out subset.

**Table 5.3. Test-set performance**

| Metric | Value |
| --- | --- |
| Test loss | 0.0562 |
| Test accuracy | 98.33% |
| Weighted F1-score | 98.33% |

The classification report indicates that the best-performing classes include Forest and SeaLake, both of which achieved near-perfect precision and recall. The most difficult distinctions occur among semantically similar land-cover classes such as AnnualCrop and PermanentCrop, which is expected in remote-sensing classification because agricultural classes often share similar spatial and spectral properties.

### 5.5 Technologies and Tools

The implemented system relies on a coherent software stack chosen to support web delivery, geospatial data handling, asynchronous analysis, and ML inference.

**Table 5.4. Technologies used in the project**

| Layer | Technologies | Role |
| --- | --- | --- |
| Frontend | React, Vite, Leaflet.js, React Leaflet, Leaflet-Geoman | User interface, map interaction, field drawing, result visualization |
| Backend | FastAPI, Pydantic | REST API, schema validation, request handling |
| Database | PostgreSQL, PostGIS, SQLAlchemy, GeoAlchemy2 | Persistent storage of users, fields, analyses, and spatial geometries |
| Background processing | Celery, Redis | Job queue, progress tracking, asynchronous analysis |
| Object storage | MinIO (S3-compatible) | Raw imagery and analysis artifact storage |
| Geospatial processing | GeoPandas, Shapely, Rasterio, NumPy | Geometry validation, area calculation, raster reading, spectral-index computation |
| Satellite access | Google Earth Engine API | Sentinel-2 imagery retrieval and compositing |
| Machine learning | PyTorch, Torchvision | Model training and inference |

### 5.6 Evaluation Approach

The evaluation of this study is conducted at two levels: machine-learning evaluation and system-level prototype evaluation.

#### 5.6.1 Machine-Learning Evaluation

The ML component is evaluated on the EuroSAT benchmark using:

- training and validation accuracy across epochs,
- held-out test accuracy,
- weighted F1-score,
- class-level precision and recall,
- confusion-matrix analysis for inter-class errors.

This part of the evaluation measures how well the fine-tuned ResNet-50 model performs as a land-cover classifier on the benchmark dataset used in training.

#### 5.6.2 Prototype System Evaluation

The system-level evaluation is scenario-based and focuses on whether the implemented platform supports the intended workflow from field registration to result review. The main evaluation criteria are:

- user authentication and protected API access,
- successful creation and storage of field boundaries,
- field-level role management and sharing,
- dispatch of analysis jobs to the background worker,
- progress tracking through status endpoints and WebSocket notifications,
- persistence and retrieval of completed analysis results,
- frontend visualization of historical and current outputs.

This level of evaluation is not a benchmark of model accuracy, but a verification that the web service successfully integrates the project components into a usable prototype workflow.

### 5.7 Summary

The methodology of the project combines benchmark-based transfer learning with a practical web implementation for field analysis. The resulting system is not only an isolated classification model, but a prototype analytical platform that connects field geometry management, cloud-based satellite-data retrieval, raster processing, asynchronous job execution, model inference, and user-facing result presentation.

This integrated methodology is the main contribution of the work. It demonstrates that transfer learning and geospatial processing can be operationalized inside a real web-based architecture rather than remaining only at the level of notebook experiments.

## 6. MVP, UML Diagrams, and Project Architecture

### 6.1 Minimum Viable Product Definition

The Minimum Viable Product (MVP) of the Farmland Analysis System is the smallest coherent version of the platform that still provides practical analytical value to the user. In the current project, the MVP includes the following capabilities:

1. User authentication with protected access to the main analytical pages.
2. Creation and storage of field boundaries from GeoJSON or manually drawn polygons.
3. Persistent storage of spatial field data in PostgreSQL/PostGIS.
4. Triggering of a background analysis workflow for a selected field.
5. Retrieval of Sentinel-2 imagery through Google Earth Engine.
6. Computation of NDVI, EVI, and field stress indicators.
7. Application of the fine-tuned ResNet-50 model to generate land-cover predictions.
8. Storage, status tracking, and later retrieval of completed analysis results.
9. Visualization of field data and analysis results through a web interface.

Features outside the current MVP include richer raster overlays, additional satellite sources, more advanced agronomic estimators, and more specialized crop-domain models.

### 6.2 Project Architecture

The architecture of the platform can be described as a four-part structure:

- client application,
- backend API,
- asynchronous worker and messaging layer,
- data and model infrastructure.

The client application is responsible for interaction and map presentation. The backend API manages authentication, persistence, and orchestration. The Celery worker executes long-running analysis tasks without blocking the API. Redis supports status communication, while PostgreSQL/PostGIS and MinIO store the final records and artifacts.

### 6.2.1 Backend Architecture

The backend is organized around routers, services, repositories, and infrastructure modules.

- Routers expose API endpoints.
- Services implement domain-specific operations such as field management and analysis launching.
- Repositories persist and retrieve structured records from the database.
- Infrastructure modules encapsulate Earth Engine access, raster processing, ML inference, object storage, and task execution.

This structure improves maintainability by separating request handling from processing and persistence logic.

### 6.2.2 Frontend Architecture

The frontend follows a component-based structure. Reusable UI components support the map view, analysis panels, field summary panels, comments, history timeline, and navigation. React state is used to manage selected fields, analysis status, seasonal filtering, and retrieval of server data.

Leaflet provides the map canvas, base imagery, and vector feature rendering. This makes the frontend suitable for interactive field-oriented workflows such as polygon inspection, selection of saved fields, and review of analysis outcomes.

### 6.2.3 Data and Analytical Architecture

The data architecture connects three main data types:

- vector field boundaries,
- remote-sensing raster imagery,
- structured analytical outputs.

Field boundaries are stored as PostGIS geometries. Satellite imagery is fetched as raster data and can be stored as artifacts. Analytical outputs such as NDVI, EVI, stress percentage, prediction class, confidence, and agronomic recommendation are stored in structured relational form and linked to the analysis job.

### 6.3 UML Diagrams

The UML section should be kept, but the figure references must be corrected so that they match Chapter 6 rather than Chapter 5.

Use the following naming pattern:

- Figure 6.1. Use case diagram
- Figure 6.2. Class diagram
- Figure 6.3. Sequence diagram
- Figure 6.4. High-level architecture diagram

The textual descriptions for these diagrams should reflect the actual implementation:

- the user can create or access fields,
- the backend enforces role-based access,
- analysis is dispatched asynchronously,
- Earth Engine, storage, database, and ML inference are all part of the execution path.

### 6.4 Summary

The architectural design of the MVP shows that the platform is more than a single dashboard or a standalone model. It is a coordinated system in which geospatial data, machine-learning inference, asynchronous execution, and persistent web delivery are combined in a coherent engineering structure.

## 7. Results and Evaluation

### 7.1 Introduction

The results of the project must be interpreted at two complementary levels. First, the machine-learning component was evaluated quantitatively on the EuroSAT benchmark dataset. Second, the web application prototype was implemented as a working analytical platform that manages fields, stores analyses, tracks asynchronous execution, and presents results through a frontend interface.

For this reason, the results chapter reports both benchmark ML performance and system-level implementation outcomes.

### 7.2 Machine-Learning Results

The fine-tuned ResNet-50 model achieved strong performance on EuroSAT. The best validation accuracy recorded during training was 98.93% at Epoch 3. On the held-out test set, the model achieved:

- test loss: 0.0562,
- test accuracy: 98.33%,
- weighted F1-score: 98.33%.

These values indicate that the transfer-learning approach was successful for the selected benchmark task. The model generalized well to unseen test images and showed only a small difference between peak validation and final test performance.

The class-level evaluation shows that the network performs especially well on visually distinct classes such as Forest and SeaLake. The more challenging agricultural distinction is between AnnualCrop and PermanentCrop, where the precision and recall values are slightly lower than for the easiest classes. This pattern is expected because some agricultural classes exhibit overlapping texture, color, and spatial organization in Sentinel-based imagery.

### 7.3 Prototype System Results

In addition to the model itself, the project produced a working prototype web system that integrates the main analytical stages into one application. The implemented prototype provides the following results:

- JWT-based authentication and protected user sessions.
- Field creation from geospatial input and persistent spatial storage in PostGIS.
- Field access control with OWNER, EDITOR, and VIEWER roles.
- Background execution of analyses through Celery.
- Progress monitoring through Redis-backed status updates and WebSocket notifications.
- Storage of analysis records, spectral-index outputs, prediction results, and recommendation summaries.
- Frontend presentation of workspace data, analysis history, and detailed field reports.

These results are important because they show that the project moved beyond an isolated training notebook. The system operationalizes the analytical workflow in a way that supports repeated use, result persistence, and user interaction.

### 7.4 Functional Interpretation of the Outputs

The current prototype stores and presents several field-level outputs for each analysis:

- mean NDVI,
- mean EVI,
- NDVI minimum and maximum values,
- stress-zone count or stress-area estimate,
- predicted land-cover class,
- prediction confidence,
- qualitative risk level,
- rule-based agronomic recommendation summary.

The combination of interpretable vegetation indices with ML-based classification improves usability. NDVI and EVI offer a familiar vegetation-oriented explanation layer, while the neural-network prediction adds a complementary data-driven estimate about scene content. The recommendation layer then translates these values into a user-readable summary.

### 7.5 Discussion of Limitations

Although the results are strong, several limitations remain.

First, the ML benchmark results are measured on EuroSAT rather than on a Kazakhstan-specific field dataset. This means that the model demonstrates strong land-cover performance on a standard benchmark, but not yet full local agronomic specialization.

Second, the deployed system currently uses a EuroSAT-trained classifier for land-cover prediction. It should therefore not be interpreted as a definitive crop-health diagnostic model or exact crop-species recognizer.

Third, parts of the visual interface still function as a prototype. Some map overlays and presentation elements are simplified compared with a full production GIS system.

Fourth, the operational workflow depends on the correct availability of external infrastructure such as Google Earth Engine credentials, Redis, MinIO, and the saved model weights.

### 7.6 Summary

Overall, the project achieved two important outcomes. The first is a high-performing transfer-learning model on the EuroSAT benchmark, with 98.33% held-out test accuracy. The second is an integrated prototype web platform that manages fields, runs asynchronous analysis workflows, stores outputs, and presents analytical results to the user in a structured interface.

These combined results support the central thesis claim that transfer learning and geodata can be brought together inside a practical farmland-analysis web service.

## 8. Technology Comparison and Selection Rationale

### 8.1 Introduction

The technology stack of the project was selected not only for individual performance, but also for interoperability. Because the platform combines API design, spatial data, raster analysis, background jobs, and machine-learning inference, the final architecture required technologies that could be integrated with minimal friction.

### 8.2 Backend Framework

FastAPI was selected as the backend framework because it combines asynchronous request handling, typed schemas, automatic documentation, and a clean development workflow in Python. These features make it more suitable for this project than lighter but less structured options such as basic Flask setups, and more compact than heavier all-in-one frameworks for a research prototype.

### 8.3 Database and Spatial Storage

PostgreSQL with PostGIS was selected because the system works with real field geometries rather than only generic tabular data. Spatial support is therefore not optional. PostGIS enables field polygons to be stored in a robust and standard geospatial format, while still integrating cleanly with SQLAlchemy and the rest of the backend stack.

### 8.4 Frontend and Map Technologies

The current implementation uses React with Vite for the frontend and Leaflet.js through React Leaflet for map rendering. This choice fits the actual needs of the project: component-based UI development, fast local iteration, and lightweight geospatial interaction.

Leaflet was preferred because it is easy to integrate with polygon layers, tile basemaps, and geospatial editing plugins. In the current codebase, this is a more accurate description than Mapbox GL JS.

### 8.5 Background Execution and Messaging

Celery and Redis were selected to support long-running analysis tasks and status communication. The main advantage of this combination is that the analytical pipeline can run outside the request-response cycle of the web API. Redis also enables efficient progress tracking and supports real-time update delivery to the frontend.

### 8.6 Geospatial and Raster Libraries

GeoPandas and Shapely are suitable for field-boundary processing because they simplify geometry validation, coordinate handling, and metadata extraction. Rasterio and NumPy are suitable for raster reading and band arithmetic because they provide direct access to image bands and efficient computation of NDVI and EVI.

### 8.7 Machine-Learning Framework

PyTorch was selected because it is flexible, widely adopted in research and prototyping, and already aligned with the training notebook used in the project. Torchvision also provides a straightforward implementation of ResNet-50 and pretrained weights, which simplifies transfer learning.

### 8.8 Satellite Data Access

Google Earth Engine was selected as the core implemented remote-sensing platform because it provides a practical way to query Sentinel-2 imagery, apply spatial filtering, and generate composites without maintaining a local scene archive. It is therefore the most suitable platform for the current research prototype.

### 8.9 Summary

The selected technology stack forms a coherent pipeline rather than a collection of unrelated tools. Its main strength is that it supports the full path from user input to geospatial analysis to ML inference to stored analytical results in one integrated system.

## 9. Mockups of the Project

### 9.1 Introduction

The project includes high-fidelity interface design and implemented frontend pages that reflect the main user workflows of the platform. In order to keep the report consistent with the current system, the mockup descriptions should focus on the screens that are actually present in the frontend and should avoid claims about features that are not implemented.

### 9.2 Authentication Screen

The authentication screen provides sign-in and registration workflows. The page includes:

- email and password input fields,
- registration support with full name and role selection,
- protected access to the rest of the platform after successful login.

Its main purpose is to provide secure entry to a user-specific analytical workspace rather than to support external SSO providers.

### 9.3 Workspace Screen

The workspace is the central operational page of the system. It combines:

- a sidebar for field and analysis context,
- an interactive Leaflet-based map,
- field drawing or selection support,
- actions for fetching satellite context and launching analysis,
- panels for field comments and result interpretation.

This screen is the practical center of the prototype because it connects field geometry, analysis execution, and interpretation in one place.

### 9.4 Analysis Details Screen

The analysis details view presents the outputs of stored analyses in a more structured reporting format. The page includes:

- prediction summary,
- NDVI and EVI indicators,
- risk-level summary,
- recommendations,
- field history and seasonal filtering.

This screen demonstrates how repeated analysis runs can be turned into a reviewable historical record rather than only a one-time result.

### 9.5 Additional Supporting Screens

The frontend also includes supporting pages for:

- home/dashboard overviews,
- project or analysis history,
- team access management,
- user profile settings,
- administrative monitoring.

These screens strengthen the claim that the project is a web platform rather than only a map viewer.

### 9.6 Summary

The mockups and implemented frontend screens show that the platform was designed around real user interaction patterns: authentication, field management, analysis launching, and result review. They should therefore be described as interface designs and implemented prototype pages, not as a complete production GIS product.

## 10. Conclusion

This diploma project developed a prototype Farmland Analysis System that integrates geospatial field management, Sentinel-2 imagery retrieval through Google Earth Engine, spectral-index computation, transfer-learning-based image classification, and web-based result presentation in one platform.

The work produced two main outcomes. First, the machine-learning component based on a fine-tuned ResNet-50 model achieved strong performance on the EuroSAT benchmark, including 98.33% test accuracy and a weighted F1-score of 98.33%. Second, the software implementation demonstrated that these analytical methods can be embedded into a real web architecture with authentication, field storage, background processing, result persistence, and user-facing dashboards.

The practical value of the project lies in this integration. Instead of treating ML, remote sensing, and GIS as separate tools, the prototype combines them into a workflow that can support field-oriented agricultural analysis. At the same time, the project remains a prototype rather than a finished production system. The current model is trained on a general land-cover benchmark, the recommendation layer is still simplified, and further localization is needed for region-specific agronomic use.

Future work should therefore focus on:

- collecting and annotating locally relevant agricultural imagery,
- training or fine-tuning models on domain-specific field data,
- improving raster overlays and visualization layers,
- extending export and reporting capabilities,
- integrating additional satellite or temporal analysis options.

Despite these limitations, the project successfully demonstrates the core research claim: transfer learning and geodata can be combined in a practical farmland-analysis web service that is both analytically meaningful and technically implementable.

## Appendix. Quick bibliography cleanup list

Before final submission, make sure the bibliography contains entries for any references you keep in the earlier chapters, especially:

- the missing sources currently cited as `[19]-[24]`,
- the EuroSAT paper,
- the ResNet paper,
- the Adam optimizer paper if mentioned,
- the transfer-learning survey if mentioned,
- any official platform sources used in Chapter 3.

If you do not want to add those entries, remove or replace the corresponding citations in the report.
