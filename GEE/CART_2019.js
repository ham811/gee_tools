# -*- coding: utf-8 -*-
"""
Created on Mon Jun 27 17:31:37 2022

@author: Hamid
"""

// Hamid Amachnoug //
// Universities: HNE EBERSWALDE + WARSAW ULS //
// Master Thesis Project //


//  Definition of the Study Area
var study_area = studyArea;

// Training Points 
var features = Training;
print('Training Polygons', features)

// Import Images
var l8 = ee.ImageCollection("LANDSAT/LC08/C01/T1_RT_TOA")
          .filterDate('2019-01-01', '2019-12-31')
          .filterMetadata('CLOUD_COVER','less_than', 10)
          .filterBounds(study_area)
          .median()
          .clip(study_area);

// Select Bands
var bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7'];
var classe = 'classe';

// Generate training data.
// Note that the class label is stored on the 'class' property.
var training = l8.select(bands).sampleRegions({
  collection: features,
  properties: ['landcover'],
  scale: 30
});

//Train the Classifier 
var classifier = ee.Classifier.smileCart().train({
  features: training,
  classProperty: 'landcover',
});

//Print Classifier 
print('Random Forest, explained', classifier.explain());

//classify the composite
var classified = l8.classify(classifier);

// Add Layers  
Map.addLayer(study_area,{},'Study Area Eberswalde', false)
Map.addLayer(classified, {min: 0, max: 4, palette: ['blue', 'yellow', 'green', 'red', 'orange']},'Supervised Classification');
Map.centerObject(study_area,12)
Map.setOptions('HYBRID');


// Accuracy 
// Accuracy assessment. Add a column of
// random uniforms for the training data set (Optional).
var withRandom = training.randomColumn('random');

//We want to reserve some of the data for testing, to avoid overfitting the model.
var split = 0.7;  // Approximatly 70% training, 30% testing
var trainingPartition = withRandom.filter(ee.Filter.lt('random', split));
var testingPartition = withRandom.filter(ee.Filter.gte('random', split));

// testing
var trainedClassifier = ee.Classifier.smileRandomForest(5).train({
  features: trainingPartition,
  classProperty: 'landcover',
  inputProperties: bands
});

// Evaluate the Classifier 
var test = testingPartition.classify(trainedClassifier);

// Confusion Matrix
var confusionMatrix = test.errorMatrix(classe, 'classification');
print('Confusion Matrix', confusionMatrix);

var confMatrix = trainedClassifier.confusionMatrix()
var OA = confMatrix.accuracy()
var CA = confMatrix.consumersAccuracy()
var Kappa = confMatrix.kappa()
var PA = confMatrix.producersAccuracy()
var Order = confMatrix.order()

print(confMatrix,'Confusion Matrix')
print(OA,'Overall Accuracy')
print(Kappa,'Kappa ')
print(CA,'Consumers Accuracy ')
print(PA,'Producers Accuracy ')
print(Order,'Order')


// Export the classification output 
Export.image.toDrive({
  image:classified,
  description:'CART_Supervised_Classification_2019',
  scale:30,
  folder: 'Download_gee',
  region:study_area,
  maxPixels:1e13
})


var exportAccuracy = ee.Feature(null, {matrix: confMatrix.array()})

// Export the FeatureCollection.
Export.table.toDrive({
  collection: ee.FeatureCollection(exportAccuracy),
  description: 'exportAccuracy',
  fileFormat: 'CSV'
});




// .area() function calculates the area in square meters
var studyArea = studyArea.geometry().area()
// We can cast the result to a ee.Number() and calculate the area in square kilometers
var stateAreaSqKm = ee.Number(studyArea).divide(1e6).round()
print(stateAreaSqKm)

// Area calculations
var areaImage = ee.Image.pixelArea().addBands(
      classified)
 
var areas = areaImage.reduceRegion({
      reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'classe',
    }),
    geometry: study_area.geometry(),
    scale: 30,
    maxPixels: 1e10
    }); 
 
print(areas)

// Classes Calculation
var allpix =  classified.updateMask(classified);  // mask the entire layer
var pixstats = allpix.reduceRegion({
  reducer: ee.Reducer.count(),               // count all pixels in a single class
  geometry: study_area,
  scale: 30,
  maxPixels: 1e10
  });


var allpixels = ee.Number(pixstats.get('classification')); // extract pixel count as a number

var arealist = [];
var areacount = function(cnr, name) {
 var singleMask =  classified.updateMask(classified.eq(cnr));  // mask a single class
 var stats = singleMask.reduceRegion({
  reducer: ee.Reducer.count(),               // count pixels in a single class
  geometry: study_area,
  scale: 30,
  maxPixels: 1e10
  });
var pix =  ee.Number(stats.get('classification'));
var hect = pix.multiply(900).divide(10000);                // Landsat pixel = 30m x 30m --> 900 sqm
var perc = pix.divide(allpixels).multiply(10000).round().divide(100);   // get area percent by class and round to 2 decimals
arealist.push({Class: names2[i], Pixels: pix, Hectares: hect, Percentage: perc});
};
var names2 = ['Water', 'Bareland', 'Forest', 'Agriculture', 'Urban'];

// execute function for each class
for (var i = 0; i < 5; i++) {
  areacount(i, names2[i]);
  }

//Print the results to the Console and examine it.
print('Area Class', arealist, '--> click list objects for individual classes');
