import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";

// One bounded asset owner per Scene. Instances share geometry and textures even
// when quality changes rebuild the landscape. Hidden resources never get instances.
export class FrontierModels{
 readonly rocks:{geometry:THREE.BufferGeometry;material:THREE.Material}[]=[];
 version=0;
 private disposed=false;
 private materials=new Set<THREE.Material>();
 private textures=new Set<THREE.Texture>();
 constructor(anisotropy:number){
  new GLTFLoader().load("/ashwatch-assets/frontier/rocks/rock_moss_set_01_1k.gltf",gltf=>{
   const originals=new Set<THREE.BufferGeometry>();gltf.scene.updateMatrixWorld(true);
   gltf.scene.traverse(o=>{if(!(o instanceof THREE.Mesh))return;originals.add(o.geometry);const materials=Array.isArray(o.material)?o.material:[o.material];
    for(const material of materials){this.materials.add(material);for(const value of Object.values(material))if(value instanceof THREE.Texture){value.anisotropy=anisotropy;this.textures.add(value);}}
    if(this.disposed)return;
    const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);geometry.computeBoundingBox();const b=geometry.boundingBox!,size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());geometry.translate(-center.x,-b.min.y,-center.z);geometry.scale(1.25/Math.max(size.x,size.z),1.25/Math.max(size.x,size.z),1.25/Math.max(size.x,size.z));geometry.computeBoundingSphere();
    this.rocks.push({geometry,material:materials[0]});
   });
   for(const geometry of originals)geometry.dispose();
   if(this.disposed){this.release();return;}this.version++;
  },undefined,()=>{}); // The original code-built rock remains a working fallback.
 }
 private release(){for(const rock of this.rocks)rock.geometry.dispose();this.rocks.length=0;for(const m of this.materials)m.dispose();for(const t of this.textures)t.dispose();this.materials.clear();this.textures.clear();}
 dispose(){this.disposed=true;this.release();}
}
