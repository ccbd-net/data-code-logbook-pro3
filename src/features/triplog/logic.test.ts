import {describe,it,expect} from 'vitest';
import {fuelMath,ordinalLabel,rankPeople} from './logic';
describe('Transport rules',()=>{
 it('multiplies litres by manual unit price',()=>expect(fuelMath(50,105,40).total).toBe(5250));
 it('subtracts allowance from entered fuel without clamping',()=>expect(fuelMath(30,105,40).excess).toBe(-10));
 it('labels second and third trips',()=>{expect(ordinalLabel(2)).toBe('২য় ট্রিপ');expect(ordinalLabel(3)).toBe('তৃতীয় ট্রিপ');});
 it('ranks people highest to lowest',()=>expect(rankPeople([{supervisor_id:'a',driver_id:'x'},{supervisor_id:'b',driver_id:'y'},{supervisor_id:'b',driver_id:'x'}],'supervisor_id')).toEqual([{id:'b',count:2},{id:'a',count:1}]));
});

import {pairTrips,joinRoute,weekday} from './logic';
describe('trip reconciliation',()=>{
 const r=(id:string,d:string,t:string,dir:string,nh=false)=>({id,entry_date:d,entry_time:t,vehicle_id:'v',direction:dir,night_hold:nh,route_id:null});
 it('joins Kalkini-Dhaka + Dhaka-Madaripur into one route',()=>{expect(joinRoute('কালকিনি - ঢাকা','ঢাকা - মাদারীপুর')).toBe('কালকিনি - ঢাকা - মাদারীপুর');});
 it('pairs night-hold up trip with next-day down trip',()=>{const p=pairTrips([r('a','2026-10-20','20:00','up',true),r('b','2026-10-21','08:00','down')]);expect(p).toHaveLength(1);expect(p[0]?.down?.id).toBe('b');});
 it('does not pair across days without night hold',()=>{const p=pairTrips([r('a','2026-10-20','20:00','up'),r('b','2026-10-21','08:00','down')]);expect(p).toHaveLength(2);});
 it('weekday is derived from date',()=>{expect(weekday('2026-10-20','en')).toBe('Tuesday');});
});
