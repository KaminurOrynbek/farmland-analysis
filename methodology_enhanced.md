# Chapter 3. Methodology

## 3.1 Research Approach and Paradigm

This study adopts an applied, system-oriented research paradigm integrating machine learning, remote sensing data processing, and interactive web-based visualization for the purpose of automated agricultural land monitoring. The primary research objective is the design, implementation, and empirical evaluation of a functional end-to-end analytical platform — rather than the derivation of novel theoretical algorithms — and the study is therefore characterised as applied research in the discipline of geospatial informatics and agricultural data science.

The experimental dimension of the research involves the controlled training and evaluation of a deep learning classification model, the sequential integration of geospatial processing components into a unified backend pipeline, and the systematic assessment of system performance under realistic operational conditions. This experimental orientation provides an empirical basis for evaluating both the technical feasibility and the practical utility of the proposed solution.

The methodological framework is governed by three overarching principles that are maintained consistently throughout all phases of the project:

- **Reproducibility.** All data sources, model architectures, training procedures, and processing libraries are publicly available, openly licensed, and well-documented. This ensures that the research can be independently verified, replicated, and extended by third parties without reliance on proprietary infrastructure.

- **Modularity.** The system is architected as a collection of loosely coupled, independently deployable components — a machine learning classification module, a geospatial processing backend, and a frontend user interface — each of which exposes well-defined interfaces and can be developed, tested, and improved in isolation.

- **Scalability.** All architectural decisions are made with future extensibility in mind, supporting the prospective integration of additional satellite data sources, expanded land-cover classification taxonomies, and broader geographic coverage beyond the prototype's current scope.

It is explicitly noted that this study does not seek to surpass state-of-the-art benchmark accuracy on remote sensing classification tasks. Its scientific contribution lies in demonstrating the feasibility and practical value of integrating transfer learning, cloud-based satellite data retrieval, geospatial raster processing, and interactive web technologies into a unified, accessible analytical platform for agricultural monitoring — a combination that the existing literature addresses only partially in end-to-end form.

---

## 3.2 System Architecture

The developed system follows a three-tier modular architecture consisting of a **frontend interface layer**, a **backend processing layer**, and an embedded **machine learning module**. This separation of concerns ensures that each tier can be maintained, tested, and scaled independently, while a well-defined RESTful API contract governs all inter-layer communication. Figure 3.1 illustrates the high-level architecture of the system.

### 3.2.1 Frontend Layer

The frontend is implemented using **React** (v18), a component-based JavaScript library that enables the construction of dynamic, responsive user interfaces through a virtual DOM rendering mechanism. React was selected over alternative frameworks such as Vue.js and Angular on the basis of its widespread adoption in production-grade web applications, its mature ecosystem of complementary libraries, and its efficient reconciliation algorithm, which is particularly advantageous for applications that require frequent map-based state updates in response to user interactions.

Geospatial map rendering is handled by **Leaflet.js**, an open-source JavaScript library for interactive web cartography. Leaflet enables efficient rendering of tile-based satellite basemap layers sourced from Sentinel Hub endpoints, vector overlay layers derived from user-uploaded GeoJSON field boundary files, and colour-coded analytical result layers produced by the backend. Its lightweight runtime footprint and compatibility with a broad range of tile providers make it well-suited to the requirements of this web service.

Users interact with the interface to define geographic areas of interest, upload field boundary files in GeoJSON format, initiate analysis requests, and inspect classification and vegetation index outputs returned by the backend as structured result overlays.

### 3.2.2 Backend Layer

The backend is developed in **Python** using the **FastAPI** framework, which serves as the central orchestration layer responsible for routing all incoming HTTP requests, coordinating data flow between system components, and managing communication with external satellite data platforms. FastAPI was selected over alternative Python web frameworks — notably Flask and Django REST Framework — due to its superior request throughput for I/O-bound operations, its native support for asynchronous coroutine-based request handling via Python's `asyncio` library, and its automatic generation of interactive, standards-compliant API documentation through the OpenAPI specification. These properties are specifically relevant for a geospatial web service in which API endpoints must handle potentially large raster data payloads and coordinate multiple sequential external service calls within a single request lifecycle.

Geospatial vector data operations — including the validation, area computation, and centroid extraction of user-uploaded field boundary polygons — are performed using **GeoPandas**, a library that extends the Pandas dataframe model to support geospatial data types and coordinate reference system (CRS) operations. Raster data manipulation — including spatial clipping of satellite imagery to parcel extents and pixel-wise spectral band arithmetic for vegetation index calculation — is performed using **Rasterio**, a Python library built on the GDAL abstraction layer.

### 3.2.3 Machine Learning Module

The machine learning module is responsible for the land-use and land-cover (LULC) classification of satellite image patches. It encapsulates the pretrained and fine-tuned **ResNet-50** model, exposes a prediction interface callable by the backend processing pipeline, and manages the sequence of preprocessing transformations required to convert raw raster data into model-compatible input tensors. The module is implemented using the **PyTorch** deep learning framework and operates as an integrated component of the backend rather than as a separately deployed microservice, simplifying deployment and reducing inter-component communication overhead in the current prototype implementation.

### 3.2.4 System Interaction Pattern

The interaction between these three layers follows a request-driven pattern. A user action on the frontend — such as uploading a GeoJSON file and submitting an analysis request — triggers an HTTP POST request to the backend API. The backend retrieves the corresponding satellite imagery from Google Earth Engine, performs geospatial processing and vegetation index computation, invokes the machine learning module for land-cover classification inference, and returns a structured JSON response. The frontend receives the response and updates the map visualization layer and the statistics panel accordingly without requiring a full page reload.

---

## 3.3 Data Processing Workflow

The data processing workflow is structured as a sequential, five-stage pipeline that transforms raw satellite imagery and user-supplied geospatial field boundaries into meaningful agricultural analysis outputs. Each stage is designed to perform a specific data transformation with clearly defined inputs and outputs, ensuring compatibility between successive processing steps and enabling fault isolation during debugging and validation.

### Stage 1 — Satellite Imagery Retrieval via Google Earth Engine

In the first stage, multispectral satellite imagery is retrieved from the **Google Earth Engine (GEE)** planetary-scale cloud computing platform using the GEE Python API (`earthengine-api`). Image collection queries are parameterised by three user-specified criteria: (1) the geographic bounding box derived from the user-uploaded GeoJSON field boundary file; (2) the temporal range of interest, specified as start and end dates; and (3) a maximum cloud coverage threshold, expressed as a percentage of the image area. The cloud coverage filter is applied at the collection level to exclude scenes in which atmospheric contamination would compromise the quality of subsequent spectral analysis.

From the filtered image collection, a **median composite** is generated over the specified time window to produce a spatially complete, temporally averaged raster that mitigates residual cloud contamination and sensor artefacts present in any individual acquisition. The resulting composite raster image is exported from GEE as a GeoTIFF file or accessed via the GEE tile server for further local processing.

### Stage 2 — Spatial Clipping to Field Boundaries

In the second stage, the retrieved raster image is spatially clipped to the boundaries of each individual agricultural parcel defined in the user-uploaded GeoJSON file. This operation is performed using the **Rasterio** library's `mask` function, which applies each polygon geometry as a binary spatial mask to the raster, retaining only the pixel values that fall within the parcel boundary and assigning a configurable no-data value to all external pixels. Clipping ensures that all downstream processing — vegetation index computation and model inference — operates exclusively on pixels belonging to the target agricultural area, preventing surrounding land-cover types from contaminating classification results.

### Stage 3 — Vegetation Index Computation

In the third stage, spectral vegetation indices — specifically the **Normalised Difference Vegetation Index (NDVI)** and the **Enhanced Vegetation Index (EVI)** — are computed from the clipped multispectral raster data using pixel-wise band arithmetic operations implemented via **NumPy** array operations.

NDVI is computed according to the formula:

> **NDVI = (NIR − RED) / (NIR + RED)**

where *NIR* and *RED* denote the surface reflectance values in the near-infrared and red spectral bands, respectively. The normalization by the sum of both bands constrains the output to the interval [−1, +1].

EVI is computed according to the formula:

> **EVI = 2.5 × (NIR − RED) / (NIR + 6·RED − 7.5·BLUE + 1)**

where *BLUE* denotes the blue spectral band, and the coefficients 6 and 7.5 are empirically derived atmospheric and soil correction factors. EVI mitigates two known limitations of NDVI: sensitivity to aerosol-laden atmospheric conditions, and saturation of index values in high-biomass, dense-canopy scenarios. Together, the two indices provide complementary diagnostic information about vegetation health and density at the parcel level.

### Stage 4 — Image Preprocessing for Model Inference

In the fourth stage, the clipped imagery is preprocessed into a format compatible with the ResNet-50 classification model. The preprocessing pipeline consists of the following operations, applied in sequence:

1. **Spatial resizing** of each image patch to 224×224 pixels using bilinear interpolation, matching the spatial input resolution expected by the ResNet-50 backbone.
2. **Per-channel normalisation** using the ImageNet dataset statistics (mean: [0.485, 0.456, 0.406]; standard deviation: [0.229, 0.224, 0.225]) to match the input distribution for which the pretrained backbone was originally optimised.
3. **Tensor conversion**, transforming the normalised NumPy array into a PyTorch `FloatTensor` of shape (C, H, W), where C denotes the number of input spectral channels.
4. **Batch dimension injection**, producing a tensor of shape (1, C, H, W) suitable for single-sample inference through the model's forward pass.

This preprocessing procedure mirrors exactly the `val_test_transform` pipeline used during model training validation to ensure consistency between training-time and inference-time data distributions.

### Stage 5 — Model Inference and Result Delivery

In the fifth and final stage, the preprocessed input tensor is passed to the fine-tuned ResNet-50 model, which produces a 10-dimensional probability distribution over the EuroSAT land-cover classes via a softmax output layer. The predicted land-cover class is determined as the argument of maximum probability (`argmax`) over this distribution. The predicted class label — together with the computed NDVI and EVI scalar values — is serialised into a structured JSON response object by the backend API handler and transmitted to the frontend for rendering as a map overlay annotation and a summary statistics panel update.

---

## 3.4 Machine Learning Model

### 3.4.1 Architecture Selection: ResNet-50

The machine learning component of the system employs a **transfer learning** strategy based on the **ResNet-50** convolutional neural network (He et al., 2016), which was pretrained on the ImageNet Large Scale Visual Recognition Challenge (ILSVRC) dataset comprising approximately 1.28 million labelled images across 1,000 object classes.

ResNet-50 is a 50-layer deep convolutional neural network organised into four residual stages, each composed of a sequence of Bottleneck residual blocks. Each bottleneck block applies three successive convolutions — a 1×1 dimensionality reduction convolution, a 3×3 spatial convolution, and a 1×1 dimensionality expansion convolution — and combines the result with a residual shortcut connection that adds the block's input directly to its output. These shortcut connections serve a dual purpose: they allow gradient signals to propagate through the network without attenuation during backpropagation, thereby mitigating the vanishing gradient problem that limits the trainable depth of vanilla deep networks, and they allow deeper layers to refine existing representations incrementally rather than learning them from scratch. This residual formulation makes it possible to train architectures of 50 or more layers stably and effectively.

The hierarchical depth of ResNet-50 allows the network to learn a nested hierarchy of feature representations of increasing abstraction and spatial scale: early layers encode low-level spectral responses and textural gradients, intermediate layers capture structural patterns and local object parts, and deep layers encode high-level semantic representations. These characteristics make ResNet-50 particularly well-suited for satellite image classification tasks, where accurate discrimination between spectrally similar land-cover classes — for example, Annual Crop and Permanent Crop — requires the integration of nuanced, multi-scale visual information.

### 3.4.2 Transfer Learning Strategy and Fine-Tuning

The transfer learning procedure follows a **full-network fine-tuning** strategy in which the entire set of pretrained convolutional weights is updated during training, rather than freezing them as fixed feature extractors. The final fully connected classification layer of the original model — a linear layer mapping from 2048 input features to 1000 ImageNet classes — is replaced with a new linear layer producing a 10-dimensional output corresponding to the 10 land-cover classes of the EuroSAT dataset:

```
model.fc = nn.Linear(in_features=2048, out_features=10)
```

This head replacement is necessary because the target classification taxonomy (EuroSAT, 10 classes) is fundamentally different from the source taxonomy (ImageNet, 1000 classes). Training then proceeds over the full network, allowing the pretrained convolutional representations to be adapted to the spectral and textural characteristics of Sentinel-2 multispectral satellite imagery while retaining the generalizable low-level feature detectors acquired during ImageNet pretraining.

### 3.4.3 Training Configuration

Training is performed over **5 epochs** on the EuroSAT training subset using the following configuration:

| Hyperparameter | Value |
|---|---|
| Optimizer | Adam |
| Learning rate | 1 × 10⁻⁴ |
| Loss function | Cross-Entropy |
| Batch size | 32 |
| Training set size | 21,600 images (80%) |
| Validation set size | 2,700 images (10%) |
| Test set size | 2,700 images (10%) |
| Compute device | NVIDIA Tesla T4 GPU |

The **Adam optimizer** (Kingma & Ba, 2015) is employed for parameter updates. Adam maintains exponentially weighted moving averages of both the first moment (mean) and the second moment (uncentred variance) of per-parameter gradient histories, using these estimates to compute an adaptive effective learning rate for each parameter independently. This adaptive mechanism renders Adam robust to variations in gradient magnitude across different layers — a property particularly beneficial in transfer learning contexts where the pretrained backbone and the newly initialised classification head may exhibit substantially different gradient scale characteristics.

The **cross-entropy loss** function measures the Kullback-Leibler divergence between the predicted class probability distribution and the true one-hot class label vector, providing a theoretically well-motivated objective for multi-class classification problems.

### 3.4.4 Data Augmentation and Normalisation

The training dataset is subject to a stochastic data augmentation pipeline designed to improve the model's ability to generalise to the photometric and geometric variability present in real-world satellite imagery. Augmentations applied to the training split include:

- **Random horizontal flipping** (applied with probability 0.5)
- **Random rotation** within a ±10° angular range

Augmentation is applied exclusively to the training subset; the validation and test subsets are processed using a deterministic transformation pipeline consisting only of spatial resizing and normalisation, ensuring unbiased evaluation metrics. All images are normalised using the ImageNet channel-wise mean and standard deviation to ensure distributional compatibility with the pretrained backbone's expected input space.

### 3.4.5 Dataset Partitioning

The EuroSAT dataset (27,000 labelled samples across 10 classes) is partitioned into training, validation, and test subsets using **stratified random sampling** (Cochran, 1977) with an 80:10:10 ratio. Stratified sampling guarantees that the relative class proportions are preserved across all three subsets, preventing partition-induced class imbalance that could lead to biased estimates of model performance. The partitioning is implemented using `sklearn.model_selection.train_test_split` with `stratify=labels` and a fixed `random_state=42` for reproducibility.

### 3.4.6 Training Results

The model was trained on the Kaggle cloud computing platform with NVIDIA Tesla T4 GPU acceleration. The training history over five epochs is summarised in Table 3.2.

| Epoch | Train Loss | Train Accuracy | Validation Loss | Validation Accuracy |
|:---:|:---:|:---:|:---:|:---:|
| 1 | 0.3164 | 90.75% | 0.0706 | 97.85% |
| 2 | 0.0967 | 96.82% | 0.0617 | 98.15% |
| 3 | 0.0757 | 97.58% | 0.0511 | **98.56%** |
| 4 | 0.0574 | 98.13% | 0.0582 | 98.04% |
| 5 | 0.0461 | 98.43% | 0.0434 | 98.41% |

*Table 3.2. Training history of the fine-tuned ResNet-50 model across five epochs.*

The best model checkpoint — determined by maximum validation accuracy — was recorded at **Epoch 3** with a validation accuracy of **98.56%** and a validation loss of 0.0511. The trained model weights are saved and subsequently loaded into the backend inference pipeline for operational land-cover classification.

The rapid convergence of validation accuracy to approximately 98% within the first epoch is consistent with the known transfer learning phenomenon, where the pretrained feature representations are already highly discriminative for the target domain and require only minor adaptation (Yosinski et al., 2014). The slight overfitting trend visible from Epoch 4 onwards — where training accuracy continues to improve while validation accuracy plateaus — motivates the use of best-checkpoint model selection rather than the final-epoch weights.

---

## 3.5 Technologies and Tools

The implementation of the system relies on a carefully selected combination of technologies for web development, geospatial data processing, machine learning, and satellite data access. Table 3.3 provides a comprehensive summary of the principal technologies employed, together with their respective functional roles within the system.

| Component | Technology | Role in the System |
|---|---|---|
| Backend API framework | FastAPI (Python) | HTTP request routing, data orchestration, OpenAPI documentation |
| Geospatial vector processing | GeoPandas | GeoJSON validation, CRS reprojection, area and centroid computation |
| Geospatial raster processing | Rasterio | Spatial clipping, band extraction, raster I/O |
| Spectral index computation | NumPy | Pixel-wise NDVI and EVI band arithmetic |
| Satellite data platform | Google Earth Engine | Cloud-based Sentinel-2 and Landsat imagery retrieval |
| Satellite tile visualization | Sentinel Hub | Frontend basemap tile rendering |
| Machine learning framework | PyTorch | Model construction, training, fine-tuning, and inference |
| Pre-trained model backbone | ResNet-50 (torchvision) | Feature extraction for land-cover classification |
| Data preparation | scikit-learn | Stratified train/val/test splitting |
| Frontend framework | React | Component-based user interface rendering |
| Web mapping library | Leaflet.js | Interactive geospatial map and overlay rendering |

*Table 3.3. Summary of technologies and their roles within the system.*

Technology selection decisions were guided by four criteria: functional suitability for the specific task, open-source licensing, active maintenance and community support, and alignment with best practices in applied machine learning systems engineering. Where multiple alternatives existed — for example, Flask versus FastAPI for the backend, or TensorFlow versus PyTorch for the machine learning module — the selected option was preferred on the basis of performance benchmarks, development ergonomics, and the availability of well-established pretrained model repositories (e.g., `torchvision.models`).

---

## 3.6 Evaluation Approach

The evaluation of the system is conducted at two complementary levels: the quantitative assessment of machine learning model performance, and the functional correctness validation of the integrated end-to-end web service.

### 3.6.1 Model Evaluation

Classification performance is evaluated on the held-out **test subset** of the EuroSAT dataset (2,700 samples, 10% of the total, selected via stratified sampling), which was withheld from both training and validation and is therefore unseen by the model during any phase of the training procedure. The following quantitative evaluation metrics are computed:

- **Overall Accuracy (OA)**: the proportion of correctly classified samples across all classes. While OA provides a general aggregate indicator of model performance, it may be misleading in the presence of class imbalance and is therefore reported together with per-class metrics.

- **Per-class Precision**: the proportion of true positive predictions among all samples predicted as belonging to a given class, measuring the model's propensity for false positive errors.

- **Per-class Recall**: the proportion of true positive predictions among all ground-truth samples of a given class, measuring the model's propensity for false negative errors.

- **F1-Score**: the harmonic mean of precision and recall for each class, providing a balanced scalar summary of per-class classification quality. The macro-averaged and weighted-averaged F1-scores are reported to account for class size imbalances.

- **Confusion Matrix**: a C × C matrix (where C = 10 is the number of classes) reporting the absolute number of samples from each true class that are predicted to belong to each predicted class. Confusion matrix analysis identifies the specific class pairs most susceptible to misclassification — for example, Annual Crop versus Permanent Crop, or Herbaceous Vegetation versus Pasture — and provides actionable diagnostic information for guiding future improvements to the training data composition or model architecture.

### 3.6.2 System-Level Evaluation

The functional evaluation of the integrated web service assesses the correctness and internal consistency of the end-to-end data processing pipeline, encompassing satellite imagery retrieval, spatial clipping, vegetation index computation, model inference, and result visualization. The system is validated using sample GeoJSON field boundary files representing agricultural parcels of known land-cover composition, and the outputs of each pipeline stage are verified against analytically computed expected values to confirm the correctness of all spatial operations and index computations. API endpoint response times under standard usage conditions are additionally measured to assess the practical responsiveness of the platform.

---

## 3.7 Summary

The methodology presented in this chapter defines a comprehensive, modular, and reproducible framework for integrating transfer learning-based satellite image classification, cloud-based geospatial data processing, and interactive web-based visualization into a unified analytical platform for automated agricultural land monitoring. The three-tier system architecture enforces a clean separation of concerns between the user interface, the processing backend, and the machine learning module, supporting independent development, testing, and scaling of each component. The five-stage data processing pipeline — from satellite imagery retrieval through GEE, spatial clipping via Rasterio, vegetation index computation, preprocessing for model inference, and result delivery — guarantees consistent and semantically interpretable outputs at each step.

The selection of ResNet-50 as the classification backbone, pretrained on ImageNet and fine-tuned on the EuroSAT benchmark dataset, reflects a principled trade-off between model capacity, training efficiency, and generalization performance. The model achieves a peak validation accuracy of 98.56% across 10 land-cover classes within five training epochs, demonstrating the effectiveness of transfer learning for satellite image classification under the constraint of a publicly available, standardized training dataset. The combination of quantitative model evaluation metrics and functional system correctness testing provides a rigorous and multi-faceted basis for assessing the scientific and engineering contributions of the study.

---

## References

Cochran, W. G. (1977). *Sampling Techniques* (3rd ed.). John Wiley & Sons.

He, K., Zhang, X., Ren, S., & Sun, J. (2016). Deep residual learning for image recognition. In *Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR)* (pp. 770–778). https://doi.org/10.1109/CVPR.2016.90

Helber, P., Bischke, B., Dengel, A., & Borth, D. (2019). EuroSAT: A novel dataset and deep learning benchmark for land use and land cover classification. *IEEE Journal of Selected Topics in Applied Earth Observations and Remote Sensing, 12*(7), 2217–2226. https://doi.org/10.1109/JSTARS.2019.2918242

Huete, A., Didan, K., Miura, T., Rodriguez, E. P., Gao, X., & Ferreira, L. G. (2002). Overview of the radiometric and biophysical performance of the MODIS vegetation indices. *Remote Sensing of Environment, 83*(1–2), 195–213. https://doi.org/10.1016/S0034-4257(02)00096-2

Kingma, D. P., & Ba, J. (2015). Adam: A method for stochastic optimization. In *Proceedings of the 3rd International Conference on Learning Representations (ICLR)*. https://arxiv.org/abs/1412.6980

Gorelick, N., Hancher, M., Dixon, M., Ilyushchenko, S., Thau, D., & Moore, R. (2017). Google Earth Engine: Planetary-scale geospatial analysis for everyone. *Remote Sensing of Environment, 202*, 18–27. https://doi.org/10.1016/j.rse.2017.06.031

Pan, S. J., & Yang, Q. (2010). A survey on transfer learning. *IEEE Transactions on Knowledge and Data Engineering, 22*(10), 1345–1359. https://doi.org/10.1109/TKDE.2009.191

Rouse, J. W., Haas, R. H., Schell, J. A., & Deering, D. W. (1974). Monitoring vegetation systems in the Great Plains with ERTS. *NASA Special Publication, 351*, 309–317.

European Space Agency. (2021). *Sentinel-2 User Handbook*. https://sentinel.esa.int

U.S. Geological Survey. (2020). *Landsat 8 Data Users Handbook*. https://www.usgs.gov

Yosinski, J., Clune, J., Bengio, Y., & Lipson, H. (2014). How transferable are features in deep neural networks? In *Advances in Neural Information Processing Systems (NeurIPS), 27*, 3320–3328. https://arxiv.org/abs/1411.1792
