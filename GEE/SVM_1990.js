# -*- coding: utf-8 -*-
"""
Created on Mon Jun 27 17:29:45 2022

@author: Hamid
"""

// Hamid Amachnoug //
// Universities: HNE EBERSWALDE + WARSAW ULS //
// Master Thesis Project //



//Load 1 shapefile red river delta
var dbsh_shape = ee.FeatureCollection('users/chungpd/DBSH_Shape');
Map.centerObject(Studyarea);
Map.addLayer(Studyarea);

// Use these bands for prediction.
var bands = ['B2', 'B3', 'B4', 'B5', 'B6','B7']
var classe = 'classe'
// Load an imagecollection over a portion of Red river delta
var Landsat = ee.ImageCollection("LANDSAT/LT05/C01/T1_TOA")
          .filterDate('1990-01-01', '1990-12-31')
          .filterMetadata('CLOUD_COVER','less_than', 10)
          .filterBounds(Studyarea)
          .median()
          .clip(Studyarea)

// Mosaic img2
// Load training polygons from a Fusion Table.
// The 'class' property stores known class labels.

// Get the values for all pixels in each polygon in the training.
var training = Landsat.select(bands).sampleRegions({
  collection: features,
  properties: ['landcover'],
  // Set the scale to get Landsat pixels in the polygons.
  scale: 10
});

// Create an SVM classifier with custom parameters.
var classifier = ee.Classifier.libsvm({
  kernelType: 'RBF',
  gamma: 0.4,
  cost: 30
});

// Train the classifier.
var trained = classifier.train(training, 'landcover', bands);

// Classify the image.
var classified = Landsat.classify(trained);

// Create a palette to display the classes.

// Display the classification result and the input image.
//Map.addLayer(image, {bands: ['VV', 'VH'], max: 0.5, gamma: 2});
//Map.addLayer(classified, {min: 0, max: 10, palette: palette}, 'Isrice');
Map.setCenter(13.905392752321193,52.818612569248685, 12);
//Map.centerObject(image, 10);
Map.addLayer(Landsat, {bands: ['B3', 'B2', 'B1'], max: 0.4}, 'image');
//Map.addLayer(classified, {min: 0, max: 4, palette: ['blue', 'green', 'yellow', 'orange','purple']},
 // 'classification');
Map.addLayer(classified, {min: 0, max: 4, palette: ['blue', 'yellow', 'green', 'red', 'orange']},'SVM 1990');


var withRandom = training.randomColumn('random');

//We want to reserve some of the data for testing, to avoid overfitting the model.
var split = 0.7;  // Approximatly 70% training, 30% testing
var trainingPartition = withRandom.filter(ee.Filter.lt('random', split));
var testingPartition = withRandom.filter(ee.Filter.gte('random', split));
var trainedClassifier = ee.Classifier.libsvm().train({
  features: trainingPartition,
  classProperty: 'landcover',
  inputProperties: bands
});

var test = testingPartition.classify(trainedClassifier);

//Print Confusion Matrix Results 
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


Export.image.toDrive({
  image:classified,
  description:'SVM Classification 1990',
  scale:30,
  folder: 'Download_gee',
  region:Studyarea,
  maxPixels:1e13
})
var exportAccuracy = ee.Feature(null, {matrix: confMatrix.array()})

// Export the FeatureCollection.
Export.table.toDrive({
  collection: ee.FeatureCollection(exportAccuracy),
  description: 'Error Matrix 1990 SVM',
  fileFormat: 'CSV'
});





// .area() function calculates the area in square meters
var studyArea = Studyarea.geometry().area()
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
    geometry: Studyarea.geometry(),
    scale: 30,
    maxPixels: 1e10
    }); 
 
print(areas)


// Classes Calculation
var allpix =  classified.updateMask(classified);  // mask the entire layer
var pixstats = allpix.reduceRegion({
  reducer: ee.Reducer.count(),               // count all pixels in a single class
  geometry: Studyarea,
  scale: 30,
  maxPixels: 1e10
  });


var allpixels = ee.Number(pixstats.get('classification')); // extract pixel count as a number

var arealist = [];
var areacount = function(cnr, name) {
 var singleMask =  classified.updateMask(classified.eq(cnr));  // mask a single class
 var stats = singleMask.reduceRegion({
  reducer: ee.Reducer.count(),               // count pixels in a single class
  geometry: Studyarea,
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
